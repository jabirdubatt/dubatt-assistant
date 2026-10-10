// GET /api/health — shows which services are configured (true/false only, never values).
import { json } from "./_lib/http.js";

export function GET() {
  return json({
    ok: true,
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    database: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY),
    email: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
  });
}
