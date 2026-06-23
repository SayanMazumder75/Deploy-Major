# Deployment Guide

This project deploys as two services:

| Layer    | Host    | Folder                              |
| -------- | ------- | ----------------------------------- |
| Frontend | Vercel  | `frontend/ai-learning-assistant`    |
| Backend  | Render  | `backend`                           |
| Database | MongoDB Atlas | (already configured)          |

> An optional Python ML service lives in `backend/ml/` but is not currently called by the Node backend. Skip it for the first deploy.

---

## 0. Before you start: rotate your secrets

`backend/.env` was previously committed to the repo. Treat these as compromised and rotate them in their respective dashboards before the first deploy:

- MongoDB Atlas DB user password
- `JWT_SECRET` (generate a new one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `GEMINI_API_KEY` (revoke + regenerate in Google AI Studio)
- `EMAIL_PASS` (revoke + regenerate the Gmail App Password)

After this PR is merged, `backend/.env` is gitignored and no longer tracked.

---

## 1. Deploy the backend to Render

1. Push this branch to GitHub and merge to `main`.
2. Go to <https://dashboard.render.com> → **New → Web Service** → connect this repo.
3. Settings (most are pre-filled by `render.yaml`):
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. **Environment Variables** — paste your *rotated* values:

   | Key             | Value                                                         |
   | --------------- | ------------------------------------------------------------- |
   | `MONGODB_URL`   | new Atlas connection string (with database name in the path) |
   | `JWT_SECRET`    | new random string                                             |
   | `JWT_EXPIRE`    | `7d`                                                          |
   | `NODE_ENV`      | `production`                                                  |
   | `MAX_FILE_SIZE` | `10485760`                                                    |
   | `GEMINI_API_KEY`| new Gemini key                                                |
   | `EMAIL_USER`    | your sender address                                           |
   | `EMAIL_PASS`    | new Gmail app password                                        |
   | `CLIENT_URL`    | (set after Vercel deploy — see step 3)                        |

   Do **not** set `PORT` — Render injects it.

5. In MongoDB Atlas → **Network Access** → add `0.0.0.0/0` (Render's free tier doesn't expose a static egress IP).
6. Deploy. Copy the service URL, e.g. `https://deploy-major-api.onrender.com`.
7. Verify: `curl https://<your-service>.onrender.com/api/health` should return `{"success":true,"status":"ok",...}`.

---

## 2. Deploy the frontend to Vercel

1. <https://vercel.com/new> → import the same repo.
2. Settings:
   - **Root Directory:** `frontend/ai-learning-assistant`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Environment Variables:**

   | Key                   | Value                                            |
   | --------------------- | ------------------------------------------------ |
   | `VITE_API_BASE_URL`   | your Render URL, **no trailing slash**           |
   | `VITE_SPEECH_APP_ORIGIN` | (optional) external speech app URL            |

4. Deploy. Copy the Vercel URL.

---

## 3. Close the loop (CORS)

1. Render dashboard → your service → **Environment** → set `CLIENT_URL` to the Vercel URL (e.g. `https://your-app.vercel.app`). Multiple origins? Comma-separate them.
2. Render redeploys automatically. CORS now allows the frontend.
3. Open the Vercel URL, sign up, upload a PDF, run a quiz. Tail Render logs if anything fails.

---

## Known limitations

- **Uploads are ephemeral on Render's free tier.** PDFs in `backend/uploads/` disappear on every redeploy / restart. For persistence, attach a Render disk (paid) or move uploads to S3 / Cloudinary / Supabase Storage.
- **Render free tier sleeps after ~15 min idle.** First request after sleep takes ~30s to spin up.
- The Python ML service in `backend/ml/` is not deployed by this config.
