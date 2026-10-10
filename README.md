# Dubatt Website Assistant

Chat widget for dubatt.com. Visitors choose what they came for (buy, sell scrap, supply, careers, research), answer a few questions, and the completed enquiry is stored and emailed to the right team. Free-typed questions are answered by Claude using only Dubatt's published information.

## How it fits together
- `public/widget.js` — the widget. One script tag on dubatt.com loads it.
- `api/chat.js` — AI answers (Claude Haiku), streamed. Rules and facts live in `api/_lib/kb.js`.
- `api/enquiry.js` — validates an enquiry, saves it to Supabase (CVs to the private `cvs` bucket), emails the team via Resend.
- `api/_lib/http.js` — routing table (which inbox gets which enquiry), allowed origins, rate limits.
- `api/health.js` — shows which services are configured.

## Routing
| Visitor | Inbox |
|---|---|
| Buyer | jabir@dubatt.com |
| Scrap seller | recycle@dubatt.com, hydher@dubatt.com |
| Supplier | hamdan@dubatt.com, aamir@dubatt.com |
| Jobseeker | it@dubatt.com |
| Research / media | jabir@dubatt.com |

## Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Value | Who sets it |
|---|---|---|
| `SUPABASE_URL` | https://bfmnmmaygiyagkeebxtw.supabase.co | set |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (or legacy service_role) | you |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | you |
| `RESEND_API_KEY` | resend.com → API Keys | you |
| `RESEND_FROM` | e.g. `Dubatt Website <website@dubatt.com>` (domain must be verified in Resend) | you |
| `ALLOWED_ORIGINS` | extra sites allowed to call the API, comma-separated (dubatt.com and www.dubatt.com are built in) | optional |
| `ANTHROPIC_MODEL` | override the model (default `claude-haiku-5-5`) | optional |

Redeploy after changing variables.

## Add to dubatt.com
```html
<script src="https://<deployment-domain>/widget.js" defer></script>
```
Optional: `data-privacy-url="https://www.dubatt.com/privacy"` links the consent text to the privacy notice.

## Editing content
- Flow questions, notes and quick answers: `public/widget.js` (`FLOWS`, `TOPICS`, `FAQ`).
- What the AI knows: `api/_lib/kb.js` (`FACTS`). Keep it consistent with the widget.

## Data
Table `public.enquiries` with RLS on and no policies, so only the server can read or write. View enquiries in Supabase → Table Editor. CVs are in the private `cvs` bucket.
