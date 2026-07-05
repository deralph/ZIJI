# 字迹 (Zì Jì) — Mandarin Tracker

A self-hosted 6-month Mandarin study tracker: daily checklist, vocab log,
flashcards (spaced repetition on your own vocab), AI sentence correction
("reverse practice"), saved speaking-practice audio, a 六个月历 calendar
styled after 田字格 character-practice paper, resource library, the full
week-by-week roadmap, stats, and a PIN-protected login.

Two parts:
- **backend/** — Node.js + Express API, backed by MongoDB
- **frontend/** — React (Vite) app, deployed as a static site

This is built to be genuinely simple: one database, one small API, one
static frontend. No extra services required beyond a free MongoDB Atlas
cluster and two free hosting accounts.

---

## 1. Set up your database (MongoDB Atlas — free)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new project, then build a free **M0** cluster (no credit card needed).
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) — simplest
   option for a small personal app; your data is still protected by the PIN and
   by your database password.
5. Click **Connect > Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Add a database name before the `?`, e.g. `.../ziji?retryWrites=true...`

Keep this string — it's your `MONGODB_URI`.

---

## 2. Set up Gemini (for Reverse Practice sentence correction — free)

1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key** — no credit card needed.
3. Copy the key. This is your `GEMINI_API_KEY`. The free tier (gemini-2.5-flash,
   250 requests/day) is far more than a daily practice habit will use.

## 3. Set up Cloudinary (for saved audio clips — free)

1. Go to https://cloudinary.com/users/register/free and create a free account.
2. On your dashboard, copy the **Cloud name** — this is your `CLOUDINARY_CLOUD_NAME`
   (used by both backend and frontend).
3. Go to **Settings > Upload > Upload presets > Add upload preset**. Set
   **Signing Mode** to **Unsigned**, save, and copy the preset name — this is
   your `CLOUDINARY_UPLOAD_PRESET` (frontend only; it's not a secret).
4. Back on the dashboard, copy your **API Key** and **API Secret** — these are
   `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` (backend only, used just to
   delete clips when you remove them).

---

## 4. Run the backend locally (optional, to test first)

```bash
cd backend
cp .env.example .env
# edit .env: paste MONGODB_URI, GEMINI_API_KEY, Cloudinary values, generate a JWT_SECRET,
# set FRONTEND_URL=http://localhost:5173
npm install
npm start
```

You should see `MongoDB connected` and `Server running on port 4000`.

Generate a random JWT_SECRET with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 5. Run the frontend locally (optional)

```bash
cd frontend
cp .env.example .env
# edit .env: VITE_API_URL=http://localhost:4000, plus your Cloudinary cloud name + preset
npm install
npm run dev
```

Open the printed local URL. First launch will ask you to create a PIN —
this is enforced by the backend, not just the browser, so it's real access
control once deployed.

---

## 6. Deploy the backend (Render — free tier)

1. Push this whole folder to a GitHub repo.
2. Go to https://render.com, sign in with GitHub.
3. **New > Web Service**, pick your repo, set:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables (same as your `.env`): `MONGODB_URI`, `JWT_SECRET`,
   `GEMINI_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `FRONTEND_URL` (fill this in after step 7, then redeploy).
5. Deploy. Note the URL Render gives you, e.g. `https://ziji-backend.onrender.com`.

Render's free tier sleeps after inactivity and wakes on the next request
(a few seconds' delay) — fine for a personal daily-use app.

## 7. Deploy the frontend (Vercel or Netlify — free)

**Vercel:**
1. Go to https://vercel.com, import the same GitHub repo.
2. Set root directory to `frontend`.
3. Add environment variables: `VITE_API_URL` (your Render backend URL from
   step 6), `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. Deploy. Vercel gives you a URL like `https://ziji.vercel.app`.

**Netlify** works the same way — root directory `frontend`, build command
`npm run build`, publish directory `dist`, same environment variables.

5. Go back to Render and set `FRONTEND_URL` to your new Vercel/Netlify URL,
   then redeploy the backend, so it only accepts requests from your app.

---

## 8. Using it day to day

Open your Vercel/Netlify URL from any device, any browser — phone, laptop,
doesn't matter. First time, you'll create a PIN. After that, log in with
it; your session stays active in that browser until you tap **Log out** in
Settings.

Your data lives in your MongoDB Atlas cluster (text/notes/progress) and
Cloudinary (audio), so it's the same data no matter which device you open
the app from.

---

## Notes on security

- The PIN is hashed (bcrypt) and checked server-side — a real gate, not
  just hiding UI in the browser.
- This is still a lightweight, single-user setup: good for keeping a
  personal tracker private, not built for handling sensitive financial or
  legal data.
- Use the **Export backup** button in Stats occasionally if you want a
  local copy outside the database, just for peace of mind (note: this
  exports your text data — journal, vocab, links, days — not the audio
  clips themselves, since those already live safely in Cloudinary).

## Notes on the new features

**Reverse practice** sends whatever you type to Gemini for correction and a
short explanation, then logs it so you can see your practice history build
up over time in the Practice tab and in Stats. Nothing is sent anywhere
except Google's API, using your own key.

**Flashcards** run a simple Leitner-style spaced repetition on your Vocab
log directly — no separate data entry needed. Mark a card "Got it" and it
comes back less often (up to every 14 days); mark it "Still learning" and
it resets to daily review. "Words mastered" in Stats counts words that have
reached the top box.

**Speaking practice audio** now actually persists: recordings upload
directly from your browser to Cloudinary (your account, your free tier —
25 credits/month, plenty for short clips), and only the resulting link is
stored in your database. Removing a clip deletes it from Cloudinary too,
not just from the list. Cloudinary's free tier is generous but not infinite
— if you record daily for 6 months, keep an eye on your dashboard usage and
delete clips you no longer need.

