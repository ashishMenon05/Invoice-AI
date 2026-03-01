# InvoiceAI Cloud: Quick Start Guide

> For the full technical deep-dive covering every algorithm, OCR strategy, and architectural decision, see [README.md](./README.md).  
> For all deployment bugs and how they were solved, see [ERRORS_AND_STRATEGIES.md](./ERRORS_AND_STRATEGIES.md).

---

## ⚡ Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Use a virtualenv or conda |
| **Node.js** | 18+ | For the Next.js frontend |
| **Tesseract OCR** | 4.0+ | Must be installed at OS level |
| **PostgreSQL** | Any | Or a free [Neon.tech](https://neon.tech) serverless DB |
| **Groq API Key** | — | Free tier at [console.groq.com](https://console.groq.com) |
| **Cloudflare R2** | — | S3-compatible bucket storage (free egress) |

**Install Tesseract (Ubuntu/Debian):**
```bash
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
which tesseract   # Confirm install path
```

---

## 🚀 Backend Setup (FastAPI + Python)

```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Edit .env — fill in DB URL, Groq key, R2 credentials, etc.

# 5. Start the backend
uvicorn main:app --reload --port 8000
```

✅ Backend running at: `http://localhost:8000`  
📖 Auto-generated API docs: `http://localhost:8000/docs`

---

## 💻 Frontend Setup (Next.js 14)

```bash
# 1. Navigate to frontend
cd frontend-next

# 2. Install dependencies
npm install

# 3. Configure backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local

# 4. Start the development server
npm run dev
```

✅ Frontend running at: `http://localhost:3000`

---

## 🌐 Expose Backend to the Internet (Cloudflare Tunnel)

If your frontend is deployed on Vercel but backend runs locally:

```bash
# Install cloudflared (Linux)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Start the tunnel
cloudflared tunnel --url http://localhost:8000
# → Provides: https://your-words.trycloudflare.com

# Or use the provided one-click script:
./start-tunnel.sh
```

Then set `NEXT_PUBLIC_API_URL=https://your-words.trycloudflare.com` in your Vercel project settings and redeploy.

---

## 🔑 Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Security
SECRET_KEY=your-super-secret-key-min-32-chars

# AI / LLM
GROQ_API_KEY=gsk_your_groq_api_key

# Cloudflare R2 Storage
R2_ACCESS_KEY=your-access-key-id
R2_SECRET_KEY=your-secret-access-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name

# Auth
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# CORS (list of allowed frontend URLs)
ALLOWED_ORIGINS=["http://localhost:3000","https://your-app.vercel.app"]

# Email Ingestion (optional)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password   # NOT your Gmail account password!
EMAIL_IMAP_SERVER=imap.gmail.com
EMAIL_IMAP_PORT=993
```

> ⚠️ **Never commit your `.env` file to Git!** It's already in `.gitignore`.

---

## 🧑‍💻 First Use

1. Open the app in your browser
2. **Register** a new account — your email becomes the admin for that organization
3. As **Admin**: go to `Settings` > configure your invoice review policy
4. As **Client**: go to `Upload Invoice` > drag and drop any PDF, image, or spreadsheet
5. Watch the AI extract structured data in real time

---

## 📦 Supported File Types

| File Type | Processing Method |
|---|---|
| `.jpg`, `.png`, `.webp` | OpenCV + Tesseract OCR + LLaMA 3.3 70B |
| `.pdf` (digital) | pdfplumber text extraction (instant) |
| `.pdf` (scanned) | OpenCV + Tesseract OCR + LLaMA 3.3 70B |
| `.xlsx`, `.csv` | pandas column mapping (no AI needed) |
