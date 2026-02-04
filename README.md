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
- `web/` — Marketing landing page (Next.js)

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

## Web Landing Page (Vercel)
Deploy the `web/` app to Vercel as your public landing page:

1. Import the GitHub repo into Vercel
2. Set **Root Directory** to `web`
3. Framework preset: **Next.js**
4. Deploy

## Optional SaaS Components (Not Active)
If you later want the SaaS stack:
- `server/` can be used as an API layer (Express + Supabase)
- `web/` can be expanded into a dashboard (Next.js + Auth0)

These are included for future expansion but are **not required** for local Gemini analysis.

## Security & Privacy
- Local storage only for analysis results and API key
- No policy text stored on external servers in local mode
- Informational use only — not legal advice

## License
Proprietary (replace with your preferred license before open‑sourcing).
