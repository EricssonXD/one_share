# 🎵 OnePlay — Complete Deployment Guide
### Cloudflare Workers + Pages · Free Forever

---

## What You're Building

A website where:
- **You (admin)** create one-time-use audio keys linked to audio files
- **Your listeners** enter a key and play the audio **exactly once** — then the key is permanently destroyed
- Everything runs on **Cloudflare's free tier** — no credit card required, no monthly bills

**Architecture:**
```
Browser  ──→  Cloudflare Pages  (your website, the frontend)
               │
               └──→  Cloudflare Worker  (your backend API)
                          │
                          └──→  Cloudflare KV  (your database)
```

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] A **Cloudflare account** (free) → https://dash.cloudflare.com/sign-up
- [ ] **Node.js** installed (version 18 or higher)
- [ ] A **terminal** (Terminal on Mac, Command Prompt or PowerShell on Windows)
- [ ] A text editor (VS Code is great, or even Notepad)

### Check if Node.js is installed

Open your terminal and type:
```bash
node --version
```

If you see something like `v18.17.0` or higher, you're good.
If you get "command not found", download Node.js from https://nodejs.org (click the LTS version).

---

## Step 1 — Create Your Project Folders

Open your terminal and run these commands one at a time.
**Copy and paste each line exactly.**

```bash
mkdir oneplay
cd oneplay
mkdir worker
mkdir "worker/src"
mkdir frontend
mkdir "frontend/src"
```

Your folder structure should now look like this:
```
oneplay/
├── worker/
│   └── src/
└── frontend/
    └── src/
```

---

## Step 2 — Add All the Files

Copy each file below into the correct location.
The file name at the top of each section tells you exactly where it goes.

### File 1 of 8 — `oneplay/worker/src/index.js`
> This is your backend. It handles creating keys, listing keys, and burning them.

→ Copy the contents of `worker_src_index.js` into `oneplay/worker/src/index.js`

---

### File 2 of 8 — `oneplay/worker/wrangler.toml`
> This tells Wrangler how to deploy your worker. You'll fill in the KV ID in Step 5.

→ Copy the contents of `worker_wrangler.toml` into `oneplay/worker/wrangler.toml`

---

### File 3 of 8 — `oneplay/frontend/package.json`
> Lists the JavaScript packages your frontend needs.

→ Copy the contents of `frontend_package.json` into `oneplay/frontend/package.json`

---

### File 4 of 8 — `oneplay/frontend/vite.config.js`
> Configuration for Vite, the tool that builds your React app.

→ Copy the contents of `frontend_vite.config.js` into `oneplay/frontend/vite.config.js`

---

### File 5 of 8 — `oneplay/frontend/index.html`
> The HTML shell that loads your React app.

→ Copy the contents of `frontend_index.html` into `oneplay/frontend/index.html`

---

### File 6 of 8 — `oneplay/frontend/src/main.jsx`
> React's entry point — just boots up the app.

→ Copy the contents of `frontend_src_main.jsx` into `oneplay/frontend/src/main.jsx`

---

### File 7 of 8 — `oneplay/frontend/src/App.jsx`
> The entire frontend app — every screen and UI component.

→ Copy the contents of `frontend_src_App.jsx` into `oneplay/frontend/src/App.jsx`

---

After copying all files, your full structure should be:
```
oneplay/
├── worker/
│   ├── src/
│   │   └── index.js          ← backend logic
│   └── wrangler.toml         ← deployment config
└── frontend/
    ├── src/
    │   ├── App.jsx            ← the whole UI
    │   └── main.jsx           ← React entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Step 3 — Install Wrangler (Cloudflare's Deployment Tool)

In your terminal, run:
```bash
npm install -g wrangler
```

Then log in to Cloudflare:
```bash
wrangler login
```

This will open a browser window. Click **"Allow"** to give Wrangler access to your Cloudflare account.

> ✅ **Success looks like:** `Successfully logged in.`

---

## Step 4 — Create the KV Database

KV (Key-Value) storage is where your audio keys are stored.
Run this command from **inside the `worker` folder**:

```bash
cd oneplay/worker
npx wrangler kv namespace create KEYS_KV
```

You'll see output that looks something like this:
```
🌀 Creating namespace with title "oneplay-worker-KEYS_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "KEYS_KV"
id = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Copy that `id` value** (yours will be different from the example above).

Now open `oneplay/worker/wrangler.toml` in your text editor.
Find this line:
```
id = "PASTE_YOUR_KV_NAMESPACE_ID_HERE"
```
Replace `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with the ID you just copied.

Save the file.

> ✅ **Your wrangler.toml should now look like:**
> ```toml
> name = "oneplay-worker"
> main = "src/index.js"
> compatibility_date = "2024-09-23"
>
> [[kv_namespaces]]
> binding = "KEYS_KV"
> id = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
> ```

---

## Step 5 — Set Your Admin Password (as a Secret)

Your admin password is stored securely as a Cloudflare secret — it never appears in your code.

Still inside the `oneplay/worker` folder, run:
```bash
npx wrangler secret put ADMIN_SECRET
```

It will prompt you:
```
Enter a secret value: ▌
```

Type your desired admin password and press Enter.
**Choose something strong — this is the password you'll use to manage keys.**

> ✅ **Success looks like:** `✨ Success! Uploaded secret ADMIN_SECRET.`

---

## Step 6 — Deploy the Worker (Backend)

Still inside `oneplay/worker`, run:
```bash
npx wrangler deploy
```

You'll see output like:
```
⛅️ wrangler 3.x.x
────────────────────
Uploaded oneplay-worker (x.xx sec)
Deployed oneplay-worker triggers (x.xx sec)
  https://oneplay-worker.YOUR_USERNAME.workers.dev
```

**Copy the URL** — it looks like `https://oneplay-worker.YOUR_USERNAME.workers.dev`
You'll need it in the next step.

> ✅ **Test it:** Open that URL in your browser. You should see `{"error":"Not found"}` — that's correct! The worker is live.

---

## Step 7 — Configure the Frontend

Now go to the frontend folder:
```bash
cd ../frontend
```

Install the frontend dependencies:
```bash
npm install
```

Create a new file called `.env.local` inside `oneplay/frontend/`:
```bash
# On Mac/Linux:
touch .env.local

# On Windows (Command Prompt):
echo. > .env.local
```

Open `.env.local` in your text editor and add this line:
```
VITE_WORKER_URL=https://oneplay-worker.YOUR_USERNAME.workers.dev
```

Replace `YOUR_USERNAME` with your actual Cloudflare username (from the URL in Step 6).

> ⚠️ **Important:** Do NOT add a trailing slash at the end of the URL.
> ✅ Correct:   `VITE_WORKER_URL=https://oneplay-worker.bob.workers.dev`
> ❌ Incorrect: `VITE_WORKER_URL=https://oneplay-worker.bob.workers.dev/`

---

## Step 8 — Build the Frontend

Still inside `oneplay/frontend`, run:
```bash
npm run build
```

You'll see output like:
```
vite v5.x.x building for production...
✓ 42 modules transformed.
dist/index.html          0.45 kB
dist/assets/index-xxxx.js  180.00 kB
✓ built in 3.50s
```

This creates a `dist/` folder with your compiled website.

---

## Step 9 — Deploy the Frontend to Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name oneplay
```

The first time you run this, it will ask:
```
? No project name provided.
? Would you like to create one? › yes
```

Type `yes` and press Enter.

You'll see:
```
✨ Deployment complete!
 └─ https://oneplay.pages.dev
```

**That's your website URL!** Open it in your browser. 🎉

---

## Step 10 — Test Everything

1. Go to your Pages URL (e.g. `https://oneplay.pages.dev`)
2. Click **ADMIN PANEL**
3. Enter the password you set in Step 5
4. Paste a direct audio URL (see "Getting Audio URLs" below) and a label
5. Click **GENERATE KEY** — a code like `RXKM-47BN` will appear
6. Copy that key, then click **EXIT**
7. Click **I HAVE A KEY**
8. Enter the key and click **UNLOCK**
9. Press play — the audio plays once
10. Try entering the same key again — it should say "already been played" ✅

---

## Getting Direct Audio URLs

Your audio URL must be a **direct link** to an audio file (not a Spotify/YouTube link).

**Free options:**
- **Cloudinary** — Upload at cloudinary.com (free 25GB), copy the `.mp3` URL
- **Dropbox** — Upload a file → Share → Copy link → change `?dl=0` to `?dl=1` at the end
- **GitHub** — Upload a file to a repo → click it → click "Raw" → copy that URL
- **Google Drive** — Upload → Share (anyone with link) → change the URL from `drive.google.com/file/d/FILE_ID/view` to `drive.google.com/uc?id=FILE_ID&export=download`

**Test that your URL works:**
Paste it directly into a browser tab — if the audio plays, it will work in OnePlay.

---

## Making Future Updates

### To update the backend (worker):
```bash
cd oneplay/worker
npx wrangler deploy
```

### To update the frontend:
```bash
cd oneplay/frontend
npm run build
npx wrangler pages deploy dist --project-name oneplay
```

### To change your admin password:
```bash
cd oneplay/worker
npx wrangler secret put ADMIN_SECRET
```
Then type your new password. No need to redeploy.

---

## Troubleshooting

### "command not found: wrangler"
You need to install it: `npm install -g wrangler`

### "Error: KV namespace not found"
You forgot to paste the KV namespace ID into `wrangler.toml`. Go back to Step 4.

### Admin login says "Could not reach the server"
Your `VITE_WORKER_URL` in `.env.local` is wrong. Double-check it has no trailing slash and matches the URL from Step 6. Then rebuild: `npm run build` and redeploy.

### Audio doesn't play
Your audio URL isn't a direct file link. Paste it in a browser — it must start playing audio immediately. See "Getting Audio URLs" above.

### The site looks broken after an update
Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R) and try again.

### "Authentication error" even with correct password
Your `ADMIN_SECRET` secret may not have been set correctly. Re-run Step 5 and redeploy the worker.

---

## Security Notes

- The **audio URL is never exposed** to the listener until the exact moment they press play — the backend hides it until key redemption
- The key is **burned on the server before the audio URL is revealed** — so even if someone closes the tab mid-request, the key is gone
- Your admin password lives only as a **Cloudflare secret** — it's never in your code files
- Cloudflare's free tier includes **DDoS protection** built in

---

## Free Tier Limits (You'll Never Hit These)

| Resource | Free Limit |
|---|---|
| Worker requests | 100,000 / day |
| KV reads | 100,000 / day |
| KV writes | 1,000 / day |
| Pages deploys | Unlimited |
| Pages bandwidth | Unlimited |

For personal use, you would need hundreds of thousands of daily users to get close to any limit.

---

*OnePlay · Built with Cloudflare Workers + Pages + KV*
