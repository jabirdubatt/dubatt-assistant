// POST /api/enquiry — validates a completed enquiry, stores it (and any CV) in Supabase,
// and emails it to the team inboxes for that visitor type via Resend.
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { ROUTES, checkOrigin, corsHeaders, preflight, json, clientIp, rateLimited, str } from "./_lib/http.js";

const MAX_CV = 4 * 1024 * 1024;
const CV_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function makeRef(code) {
  const d = new Date(Date.now() + 4 * 3600 * 1000); // Dubai date
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  return `DBT-${code}-${ymd}-${randomInt(1000, 10000)}`;
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const label = k => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

function emailBody(rec) {
  const rows = [
    ["Reference", rec.ref], ["Enquiry", rec.enquiry_type],
    ["Name", rec.contact.name], ["Company", rec.contact.company], ["Email", rec.contact.email],
    ["Phone", rec.contact.phone], ["Location", rec.contact.country],
    ...Object.entries(rec.details).map(([k, v]) => [label(k), v]),
    ["Submitted from", rec.source_page], ["Received", new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" }) + " (Dubai)"]
  ].filter(([, v]) => v);
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#16201b">
<p style="margin:0 0 12px">New enquiry from the dubatt.com website assistant. Reply to this email to reach the visitor directly.</p>
<table cellpadding="6" style="border-collapse:collapse;border:1px solid #d6ddd9">${rows.map(([k, v]) =>
    `<tr><td style="border:1px solid #d6ddd9;background:#f1f4f2;font-weight:bold;white-space:nowrap">${esc(k)}</td><td style="border:1px solid #d6ddd9">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin:12px 0 0;color:#5a6760;font-size:12px">Stored in the Dubatt enquiries database under ${esc(rec.ref)}.</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { html, text };
}

async function sendEmail(rec, cv) {
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (!key || !from) return { status: "not_configured" };
  const { html, text } = emailBody(rec);
  const payload = {
    from,
    to: rec.routed_to,
    reply_to: rec.contact.email,
    subject: `Website enquiry ${rec.ref} · ${rec.enquiry_type} · ${rec.contact.name}`,
    html, text
  };
  if (cv) payload.attachments = [{ filename: cv.name, content: cv.buffer.toString("base64") }];
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (r.ok) return { status: "sent" };
    const detail = (await r.text().catch(() => "")).slice(0, 500);
    console.error("resend error", r.status, detail);
    return { status: "failed", error: `${r.status} ${detail}` };
  } catch (e) {
    console.error("resend fetch failed", e);
    return { status: "failed", error: String(e).slice(0, 500) };
  }
}

export function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  const origin = checkOrigin(request);
  const cors = corsHeaders(origin);
  if (!origin) return json({ error: "origin_not_allowed" }, 403, cors);
  if (rateLimited("enq:" + clientIp(request), 8, 10 * 60 * 1000)) return json({ error: "rate_limited" }, 429, cors);

  let form;
  try { form = await request.formData(); } catch { return json({ error: "bad_request" }, 400, cors); }

  const flowId = str(form.get("flow"), 20);
  const route = ROUTES[flowId];
  if (!route) return json({ error: "bad_flow" }, 400, cors);

  // Honeypot: real visitors never fill this hidden field.
  if (str(form.get("website"), 200)) return json({ ok: true, ref: makeRef(route.code) }, 200, cors);

  let contactIn, detailsIn;
  try {
    contactIn = JSON.parse(str(form.get("contact"), 5000) || "{}");
    detailsIn = JSON.parse(str(form.get("details"), 20000) || "{}");
  } catch { return json({ error: "bad_request" }, 400, cors); }

  const contact = {
    name: str(contactIn.name, 120), company: str(contactIn.company, 160), email: str(contactIn.email, 160),
    phone: str(contactIn.phone, 40), country: str(contactIn.country, 120)
  };
  const errors = [];
  if (!contact.name) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) errors.push("email");
  if (contact.phone.replace(/\D/g, "").length < 8) errors.push("phone");
  if (!contact.country) errors.push("country");
  if (form.get("consent") !== "yes") errors.push("consent");
  if (errors.length) return json({ error: "invalid", fields: errors }, 422, cors);

  const details = {};
  Object.entries(detailsIn || {}).slice(0, 20).forEach(([k, v]) => {
    const key = str(k, 40).replace(/[^\w]/g, "");
    const val = str(typeof v === "string" ? v : String(v ?? ""), 1000);
    if (key && val) details[key] = val;
  });

  let cv = null;
  const file = form.get("cv");
  if (flowId === "jobs" && file && typeof file === "object" && file.size > 0) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!CV_TYPES[ext]) return json({ error: "cv_type" }, 422, cors);
    if (file.size > MAX_CV) return json({ error: "cv_size" }, 413, cors);
    cv = { name: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120), type: CV_TYPES[ext], buffer: Buffer.from(await file.arrayBuffer()) };
  }

  const enquiryType = str(form.get("type"), 80) || route.label;
  const rec = {
    ref: makeRef(route.code), flow: flowId, enquiry_type: enquiryType, routed_to: route.to,
    contact, details, source_page: str(form.get("page"), 500) || null
  };

  const supa = db();
  let stored = false;
  if (supa) {
    if (cv) {
      const path = `${new Date().getFullYear()}/${rec.ref}-${cv.name}`;
      const up = await supa.storage.from("cvs").upload(path, cv.buffer, { contentType: cv.type, upsert: false });
      if (up.error) console.error("cv upload failed", up.error.message); else rec.cv_path = path;
      details.cv = details.cv || cv.name;
    }
    let ins = await supa.from("enquiries").insert(rec);
    if (ins.error && ins.error.code === "23505") { rec.ref = makeRef(route.code); ins = await supa.from("enquiries").insert(rec); }
    if (ins.error) console.error("insert failed", ins.error.message); else stored = true;
  }

  const mail = await sendEmail(rec, cv);
  if (stored) {
    const upd = await supa.from("enquiries").update({ email_status: mail.status, email_error: mail.error || null }).eq("ref", rec.ref);
    if (upd.error) console.error("status update failed", upd.error.message);
  }

  if (!stored && mail.status !== "sent") return json({ error: "not_delivered" }, 503, cors);
  return json({ ok: true, ref: rec.ref }, 200, cors);
}
