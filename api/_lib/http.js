// Shared helpers: CORS, JSON responses, a light per-instance rate limit, and enquiry routing.

export const ROUTES = {
  buy:    { code: "B", label: "Buy from Dubatt",             team: "Sales",               to: ["jabir@dubatt.com"] },
  sell:   { code: "S", label: "Sell us scrap batteries",     team: "Battery procurement", to: ["recycle@dubatt.com", "hydher@dubatt.com"] },
  supply: { code: "P", label: "Supply to Dubatt",            team: "Purchasing",          to: ["hamdan@dubatt.com", "aamir@dubatt.com"] },
  jobs:   { code: "J", label: "Careers and CV",              team: "HR",                  to: ["it@dubatt.com"] },
  info:   { code: "R", label: "Research and media requests", team: "Communications",      to: ["jabir@dubatt.com"] }
};

const DEFAULT_ORIGINS = ["https://www.dubatt.com", "https://dubatt.com"];

function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

// Returns the origin to echo back, or null if the caller is not allowed.
export function checkOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host && origin === `https://${host}`) return origin;           // the deployment's own test page
  if (allowedOrigins().has(origin)) return origin;
  if (process.env.ALLOW_VERCEL_PREVIEWS === "1" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
  return null;
}

export function corsHeaders(origin) {
  return origin ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  } : { "Vary": "Origin" };
}

export function preflight(request) {
  const origin = checkOrigin(request);
  return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
  });
}

export function clientIp(request) {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

// Best-effort limiter; resets when the function instance recycles.
const buckets = new Map();
export function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return hits.length > max;
}

export function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
