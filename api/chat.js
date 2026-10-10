// POST /api/chat — answers a visitor's free-typed question with Claude, streamed as plain text.
import { RULES } from "./_lib/kb.js";
import { checkOrigin, corsHeaders, preflight, json, clientIp, rateLimited, str } from "./_lib/http.js";
import { ROUTES } from "./_lib/http.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  const origin = checkOrigin(request);
  const cors = corsHeaders(origin);
  if (!origin) return json({ error: "origin_not_allowed" }, 403, cors);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503, cors);
  if (rateLimited("chat:" + clientIp(request), 30, 10 * 60 * 1000)) return json({ error: "rate_limited" }, 429, cors);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_request" }, 400, cors); }

  const raw = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  const messages = raw
    .map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: str(m?.content, 1500) }))
    .filter(m => m.content);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "bad_request" }, 400, cors);

  const flow = ROUTES[body?.flow];
  const system = RULES + (flow ? `\n\n(The visitor is currently filling in the "${flow.label}" enquiry.)` : "");

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages, stream: true })
    });
  } catch (e) {
    console.error("anthropic fetch failed", e);
    return json({ error: "upstream" }, 502, cors);
  }
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, detail.slice(0, 500));
    return json({ error: "upstream" }, 502, cors);
  }

  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") controller.enqueue(enc.encode(ev.delta.text));
              else if (ev.type === "error") console.error("anthropic stream error", ev.error);
            } catch { /* ignore partial lines */ }
          }
        }
      } catch (e) {
        console.error("stream read failed", e);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" }
  });
}
