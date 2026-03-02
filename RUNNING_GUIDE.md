# 🟢 InvoiceAI — How to Start & Stop

## ▶️ STARTING THE APP

### Step 1 — Start the Backend
Open a terminal and run:
```bash
cd "/home/ashish/PROJECTS/PROJECT DESIGN/invoice-ai-cloud/backend"
/home/ashish/python/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```
✅ Wait until you see:
```
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

---

### Step 2 — Start the Cloudflare Tunnel
**Open a NEW terminal tab** and run:
```bash
cloudflared tunnel --url http://localhost:8000
```
✅ Wait until you see:
```
Registered tunnel connection connIndex=0 ...
```
And look for your URL:
```
https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com   ← COPY THIS
```

---

### Step 3 — Update Vercel (only if the URL changed from last time)
1. Go to [vercel.com](https://vercel.com) → `invoice-ai` project
2. **Settings → Environment Variables**
3. Edit `NEXT_PUBLIC_API_URL` → paste the new tunnel URL
4. Click **Save** → click **Redeploy** when prompted
5. Wait ~2 minutes for the deployment to go **Ready** ✅

---

### Step 4 — Open the App
Go to 👉 [https://invoice-ai-ashy.vercel.app](https://invoice-ai-ashy.vercel.app)

Login with Google. Done! 🎉

---

## ⛔ STOPPING THE APP

### Stop the Backend
Go to the terminal running uvicorn and press:
```
Ctrl + C
```

### Stop the Tunnel
Go to the terminal running cloudflared and press:
```
Ctrl + C
```

### Kill everything at once (if stuck)
```bash
pkill -f "uvicorn main:app"
pkill -f "cloudflared"
```

---

## ⚠️ IMPORTANT RULES

| Rule | Why |
|---|---|
| Always start **backend first**, tunnel second | Tunnel fails if nothing is on port 8000 |
| Keep **both terminals open** while using the app | Closing either = app goes offline |
| The tunnel URL **changes every restart** | You must update Vercel each time |
| Don't run uvicorn twice | Will crash with "Address already in use" error — kill first then restart |

---

## 🔍 Check if everything is running

```bash
# Is backend alive?
curl http://localhost:8000/health
# Should return: {"status":"healthy","db":"connected","llm":"configured"}

# Is port 8000 in use?
ss -tlnp | grep 8000
```

---

## 🆘 Trouble? Common Fixes

| Problem | Fix |
|---|---|
| `Address already in use` on port 8000 | Run `pkill -f "uvicorn"` then restart |
| Tunnel shows `control stream failure` errors | Backend isn't running — start uvicorn first |
| Can't login / Authentication error | Tunnel URL changed — update Vercel env var and redeploy |
| App loads but shows no data | Check backend is running: `curl http://localhost:8000/health` |
