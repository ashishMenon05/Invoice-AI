# InvoiceAI — Running Guide

## Architecture (Local + Tunnel)

```text
Vercel (Next.js Frontend)
       |
       | HTTPS (via Cloudflare Tunnel)
       v
Local Laptop (Ubuntu/Linux)
  └── backend/ (FastAPI + Tesseract + OpenCV + APScheduler)
       |              |
       v              v
 Neon PostgreSQL   Cloudflare R2
  (Database)        (File Storage)
```

The backend runs locally on your machine, and Cloudflare Tunnel exposes it securely to the internet so the Vercel frontend can connect to it.

---

## 🚀 How to Start the App

You need two terminal windows open to run the backend and the tunnel simultaneously.

### Terminal 1: Start the Backend

```bash
# 1. Navigate to the backend directory
cd "/home/ashish/PROJECTS/PROJECT DESIGN/invoice-ai-cloud/backend"

# 2. Activate your Python virtual environment (if applicable)
source /home/ashish/python/bin/activate 

# 3. Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000
```
*Wait until you see `Application startup complete.`*

### Terminal 2: Start Cloudflare Tunnel

```bash
# Start a quick tunnel pointing to your local server
cloudflared tunnel --url http://localhost:8000
```

1. Look for a line in the output like this:
   `https://xxxx-xxxx-xxxx.trycloudflare.com`
2. **Copy this URL.**

---

## 🌐 Update Vercel Frontend

Every time you restart the Cloudflare quick tunnel, the URL changes. You must update Vercel with the new URL.

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_API_URL`
3. Set the value to `https://xxxx-xxxx-xxxx.trycloudflare.com` (paste your copied tunnel URL).
4. Click **Save**.
5. Go to the **Deployments** tab and click **Redeploy** on the latest deployment for the changes to take effect.

> **💡 Pro Tip:** To avoid changing this URL every time, you can set up a **Named Cloudflare Tunnel** if you own a custom domain.

---

## ⚙️ Prerequisites & Installation

If you haven't installed `cloudflared` yet:

```bash
# Install cloudflared (Ubuntu/Debian)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

Ensure your `backend/.env` file is fully configured with all necessary secrets: `DATABASE_URL`, Google OAuth variables, Groq API, Cloudflare R2 variables, and Email credentials.
