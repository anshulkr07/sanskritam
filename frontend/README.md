# Sanskritam Test Console

A lightweight static web frontend (test console) for the Sanskritam Sanskrit-learning backend API.

## Quick Start

```bash
# Serve the frontend directory
cd frontend
python -m http.server 5500

# Open in browser
open http://localhost:5500
```

Then configure the **Base URL** field to point at your running backend (default: `http://localhost:8000`) and click **Health Check**.

## What It Tests

| Tab | Endpoint | Purpose |
|-----|----------|---------|
| **Auth** | `POST /auth/dev-login`, `GET /me` | Login flow, learner model display (ratios, streak, feature mastery) |
| **Practice** | `GET /challenges/next`, `POST /attempts` | Challenge → attempt → verdict cycle with grammar notes |
| **Shloka** | `GET /shlokas/today` | Daily shloka with word breakdown (tap words for meaning) |
| **Varnamala** | `GET /grammar/varnamala` | Sanskrit phoneme grid |
| **Features** | `GET /grammar/features` | Grammar feature taxonomy table |
| **Docs** | `/docs` link | Links to backend Swagger UI |

## Notes

- **No build step** — pure vanilla JS, HTML, CSS. Serve with any static file server.
- **CORS**: The backend is expected to have CORS open (allow all origins) for development. If not, use a CORS proxy or configure the backend's `CORSMiddleware`.
- **Token persistence**: Auth token is stored in `localStorage`. Clear it with the Logout button.
- **Request Log**: Every API call is logged at the bottom of the page with method, path, status code, and response preview. This is intentionally raw — this is a test console.
- **Devanagari rendering**: Requires the **Noto Sans Devanagari** font (loaded from Google Fonts). Works offline if the font is cached.

## File Structure

```
frontend/
├── index.html    # Main page with tabbed layout
├── style.css     # Light theme styles
├── app.js        # All API interactions + DOM updates
└── README.md     # This file
```