# ClearTerms AI

ClearTerms AI is a browser extension that detects Terms of Service and Privacy Policy pages and translates them into clear, evidence‑based risk insights before a user accepts. The extension runs **local‑first** and uses the Gemini API directly (no backend required).

## Highlights
- Real‑time policy detection (URL, title, headings, body signals)
- Evidence‑first red flags with verbatim quotes
- Clear risk score and executive summary
- Full report view with red flags, data rights, and opt‑out steps
- Local caching of analyses per domain

## Repository Structure
- `extension/` — Chrome extension (popup + report UI, content script, background worker)
- `server/` — Optional Express API (SaaS backend scaffold)
- `web/` — Optional Next.js dashboard (SaaS web app scaffold)

> The extension currently uses **local Gemini mode** and does **not** call the `server/` API.

## Quick Start (Extension)
1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `extension/`
4. Open extension **Settings** and paste your **Gemini API Key**
5. Visit a Terms/Privacy page and run **Analyze This Policy**

## Local Gemini Mode (Default)
No backend is required. The extension calls Gemini directly from the background service worker.

### Key Settings
- **Gemini API Key** is stored in `chrome.storage.local`
- Only sent to Gemini when analysis is triggered

## Optional SaaS Components (Not Active)
If you later want the SaaS stack:
- `server/` can be used as an API layer (Express + Supabase)
- `web/` can be used as a user dashboard (Next.js + Auth0)

These are included for future expansion but are **not required** for local Gemini analysis.

## Deployment (Vercel — Web App Only)
If you want to deploy the `web/` dashboard:
1. Create a new Vercel project and import this repo
2. Set **Root Directory** to `web`
3. Add Auth0 environment variables in Vercel
4. (Optional) Set `NEXT_PUBLIC_API_BASE_URL` if you deploy the API later

### Suggested Env Vars (`web/.env.local`)
```
NEXT_PUBLIC_API_BASE_URL=
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=
```

## Security & Privacy
- Local storage only for analysis results and API key
- No policy text stored on external servers in local mode
- Informational use only — not legal advice

## License
Proprietary (replace with your preferred license before open‑sourcing).
