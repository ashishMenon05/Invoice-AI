# InvoiceAI Cloud 🧾🤖
### Autonomous Multi-Tenant Financial Document Extraction Platform

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon.tech-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-R2_Storage-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-FF6B35?style=for-the-badge)

**Live Frontend:** [invoice-ai-ashy.vercel.app](https://invoice-ai-ashy.vercel.app)  
**Backend:** Self-hosted via Cloudflare Tunnel (local machine → public HTTPS URL)

</div>

---

## 📖 What is InvoiceAI Cloud?

InvoiceAI Cloud is an **enterprise-grade B2B SaaS platform** that autonomously transforms chaotic, unstructured financial documents (crumpled receipts, scanned PDFs, Excel spreadsheets, emailed invoices) into clean, structured, database-ready JSON — with **zero template training, zero manual input, and zero downtime**.

Traditional OCR systems fail on complex invoices because they use brittle regex pattern matching. InvoiceAI solves this by combining:
1. **Computer Vision preprocessing** (OpenCV adaptive thresholding → perfect text isolation)
2. **Spatial OCR** (Tesseract PSM 6 → row-alignment preservation)  
3. **LLM Reasoning** (LLaMA 3.3 70B → semantic understanding of any invoice layout)

The result: an AI "accountant" that reads invoices the way a human does — understanding context, layout, and meaning — not just matching patterns.

---

## 🖼️ Application Screenshots

### � Login / Sign Up

<div align="center">
  <img src="./assets/screenshots/login_page.png" alt="Login Page" width="70%"/>
  <br/><sub>Dual-mode authentication — Google OAuth one-click SSO or traditional Email/Password. Demo credentials shown on page.</sub>
</div>

---

## �👤 Client View

> The client interface is designed for simplicity — upload invoices, track AI processing live, and review extracted financial data.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_dashboard.png" alt="Client Dashboard"/>
      <br/><b>Dashboard</b>
      <br/><sub>Live pipeline stats (Queued / Processing / Done), 7-day volume chart, and recent invoice feed with status badges</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_upload.png" alt="Upload Interface"/>
      <br/><b>Upload Invoice</b>
      <br/><sub>Drag-and-drop multi-file upload — supports PDF, JPG, PNG, XLSX, CSV. Batched processing to prevent server overload</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_invoices.png" alt="My Invoices"/>
      <br/><b>My Invoices — Status Tracking</b>
      <br/><sub>Full invoice list with AI-extracted vendor, amount, date, confidence score, and real-time status (Auto Approved / Under Review / Rejected)</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_invoice_detail.png" alt="Invoice Detail — AI Processed"/>
      <br/><b>Invoice Detail — AI Extraction Result</b>
      <br/><sub>Split-screen view: original file on left, structured AI-extracted JSON (line items, totals, taxes) on right. Human can review and confirm</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_email.png" alt="Gmail Invoice Sending"/>
      <br/><b>Email Ingestion</b>
      <br/><sub>Forward invoices directly from Gmail to the organization's dedicated ingestion address — AI picks it up automatically within 60 seconds</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/client_dashboard.png" alt="Submit via Email Card"/>
      <br/><b>Email Ingestion Card</b>
      <br/><sub>Dashboard shows the dedicated ingestion email address with a one-click Copy button</sub>
    </td>
  </tr>
</table>

---

## 🛡️ Admin View

> Admins get full organizational visibility — analytics, invoice review queue, client management, policy engine, and audit controls.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_dashboard.png" alt="Admin Dashboard"/>
      <br/><b>Admin Dashboard</b>
      <br/><sub>Org-wide KPIs: Total Invoices (135), Auto-Approval Rate (59.3%), Fraud Flags (9), Duplicates Found (4), Avg Processing Time (7.45s)</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_analytics.png" alt="Admin Analytics"/>
      <br/><b>Analytics — 7-Day Volume & Approval Distribution</b>
      <br/><sub>Line chart for processing volume vs fraud trends. Donut chart showing Auto Approved / Approved / Under Review / Rejected split</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_invoices.png" alt="All Invoices"/>
      <br/><b>All Invoices — Full Audit Log</b>
      <br/><sub>Complete list of every invoice across all clients — with vendor, amount, status, confidence score, and approve/reject action buttons</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_review.png" alt="Admin Approve/Reject"/>
      <br/><b>Invoice Review — Accept / Reject</b>
      <br/><sub>Side-by-side comparison: original invoice file vs AI extraction. Admin can approve instantly or reject with a reason</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_users.png" alt="Client Management"/>
      <br/><b>Client / User Management</b>
      <br/><sub>View all registered users in the organization — email, role, join date, and invoice submission count</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/admin_settings.png" alt="Admin Settings / Policy Engine"/>
      <br/><b>Policy Engine & Settings</b>
      <br/><sub>Configure per-org rules: auto-approve confidence threshold, duplicate detection, fraud flag sensitivity, and allowed vendors</sub>
    </td>
  </tr>
</table>

---

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                                │
│          Vercel (Next.js 14 SSR Frontend)                       │
│    invoice-ai-ashy.vercel.app                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS API Calls (NEXT_PUBLIC_API_URL)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            CLOUDFLARE TUNNEL (Public HTTPS ↔ Local)             │
│    https://vids-exec-tunnel-level.trycloudflare.com             │
└────────────────────┬────────────────────────────────────────────┘
                     │ Routed to localhost:8000
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              FASTAPI BACKEND (localhost:8000)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  /auth   │ │/invoices │ │ /admin   │ │  APScheduler     │  │
│  │ Google   │ │  Upload  │ │ Policies │ │  (Email Polling) │  │
│  │ OAuth    │ │  OCR/LLM │ │ Analytics│ │  Every 60s       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└───────────┬────────────┬─────────────────────────────────────────┘
            │            │
            ▼            ▼
┌───────────────┐  ┌─────────────────────────────────────────────┐
│  Neon.tech    │  │           Cloudflare R2 Storage             │
│  PostgreSQL   │  │   organizations/{org_id}/invoices/{uuid}    │
│  (Serverless) │  │   S3-compatible · Zero egress fees          │
└───────────────┘  └─────────────────────────────────────────────┘
```

---

## 🧠 The AI Pipeline Deep-Dive

### Step 1: Document Ingestion & Classification
```
File Upload / Email Attachment
        │
        ├──► .xlsx / .csv → pandas direct mapping (bypasses AI entirely, instant)
        ├──► Digital PDF  → pdfplumber text extraction (<0.1s, pixel-perfect)
        └──► Image / Scanned PDF → Computer Vision Pipeline ↓
```

### Step 2: Computer Vision (OpenCV)
```python
# 1. Convert to grayscale (remove color noise)
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# 2. Adaptive Gaussian Thresholding
#    Handles crumpled receipts, shadows, bad lighting
processed = cv2.adaptiveThreshold(
    gray, 255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY, 11, 2
)
```

### Step 3: Spatial OCR (Tesseract PSM 6)
```python
# PSM 6 = "Assume single uniform block of text"
# This PRESERVES horizontal row alignment:
#   Item | Qty | Price   ← stays intact
# Standard PSM 3 would scramble all columns
config = "--oem 3 --psm 6"
text = pytesseract.image_to_string(processed, config=config)
```

### Step 4: LLM Extraction (LLaMA 3.3 70B via Groq)
```python
# 70B parameter model reasons about the invoice
# like a human accountant would
# Enforces strict JSON output with heuristic defenses:
# "Quantities are small integers — do not confuse SKU codes with quantities"
```

### Step 5: Deterministic Failsafe
```python
# If LLM missed Grand Total but extracted line items:
if extracted.get("grand_total") is None:
    line_totals = [item.get("line_total", 0) for item in line_items]
    extracted["grand_total"] = sum(line_totals)
    # Math is too important to leave to AI imagination
```

---

## 🔒 Multi-Tenant Security Architecture

Every piece of data in InvoiceAI is scoped to an **Organization**. The database schema enforces this at every layer:

```
Organization
    └── Users (org_id FK)
    └── Invoices (org_id FK)
    └── OrganizationPolicy (org_id FK)
    └── InvoiceEvents (via invoice → org cascade)
```

**Why this matters:** Even if a client guesses another organization's invoice UUID, the FastAPI `require_client` dependency injects the calling user's `org_id` into **every** SQLAlchemy query. It is physically impossible for Tenant A to read Tenant B's data at the API layer.

---

## 🛠️ Full Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend Framework | Next.js 14 (App Router) | SSR, optimized routing, TypeScript |
| Frontend Styling | Tailwind CSS | Dark mode glassmorphism, responsive |
| Backend Framework | FastAPI | Async I/O, Pydantic validation, OpenAPI |
| ASGI Server | Uvicorn | High-performance async HTTP |
| Database | PostgreSQL on Neon.tech | ACID compliance, serverless scaling |
| ORM | SQLAlchemy | Type-safe queries, injection prevention |
| AI / LLM | Groq API (LLaMA 3.3 70B) | 800 tokens/sec, best reasoning accuracy |
| OCR Engine | Tesseract 5 + OpenCV | Spatial layout preservation with PSM 6 |
| Object Storage | Cloudflare R2 | S3-compatible, zero egress bandwidth fees |
| Background Jobs | APScheduler + BackgroundTasks | Non-blocking async pipeline |
| Authentication | JWT (HS256) + Google OAuth | Stateless, scalable authentication |
| Password Hashing | Passlib + BCrypt | Salted, irreversible hashing |
| Rate Limiting | SlowAPI | API abuse prevention |
| Email Integration | IMAP (Gmail) + smtplib | Automated email invoice ingestion |
| Tunnel | Cloudflare Tunnel | Expose local backend to the internet |

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Tesseract OCR installed (`tesseract-ocr`, `tesseract-ocr-eng` via apt)
- PostgreSQL (or a free [Neon.tech](https://neon.tech) account)
- [Groq API key](https://console.groq.com) (free tier available)
- [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket

### Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv && source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Copy example env and fill in your values
cp .env.example .env
# Edit .env with your DB URL, Groq key, R2 credentials

# Start the backend
uvicorn main:app --reload --port 8000
# API docs available at: http://localhost:8000/docs
```

### Frontend Setup
```bash
cd frontend-next

# Install dependencies
npm install

# Set environment variable
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local

# Start development server
npm run dev
# App available at: http://localhost:3000
```

---

## 🌐 Production Deployment: Cloudflare Tunnel + Vercel

This project uses **your local machine as the backend server** exposed via Cloudflare Tunnel for maximum performance (no memory limits vs cloud free tiers).

### Step 1: Start the Backend
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 2: Create a Public URL (Cloudflare Tunnel)
```bash
# Quick tunnel (URL changes on restart):
cloudflared tunnel --url http://localhost:8000

# Or use the provided startup script:
./start-tunnel.sh
```
Copy the `https://xxxx.trycloudflare.com` URL shown.

### Step 3: Connect Vercel Frontend
1. Go to [vercel.com](https://vercel.com) → your project → **Settings → Environment Variables**
2. Set `NEXT_PUBLIC_API_URL` = `https://xxxx.trycloudflare.com`
3. Trigger a redeploy

### Step 4: Configure Environment Variables (`.env`)
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SECRET_KEY=your-secret-key-here
GROQ_API_KEY=gsk_xxx
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name
GOOGLE_CLIENT_ID=your-google-oauth-client-id
ALLOWED_ORIGINS=["https://your-vercel-app.vercel.app","http://localhost:3000"]
```

---

## 📧 Automated Email Invoice Ingestion

InvoiceAI can autonomously ingest invoices sent to a configured email address:

1. Set `EMAIL_ADDRESS` and `EMAIL_PASSWORD` (Gmail App Password) in `.env`
2. The backend polls IMAP every 60 seconds
3. Any PDF/image attachment from a recognized organization domain is automatically:
   - Downloaded from Gmail
   - Processed through the full OCR + LLM pipeline
   - Saved to Cloudflare R2
   - Added to the invoice database
   - Acknowledged with an automated reply email to the sender

---

## 📋 Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SECRET_KEY` | JWT signing secret | Any long random string |
| `GROQ_API_KEY` | Groq LLM API key | `gsk_xxx...` |
| `R2_ACCESS_KEY` | Cloudflare R2 Access Key ID | 32-char hex string |
| `R2_SECRET_KEY` | Cloudflare R2 Secret Access Key | 64-char hex string |
| `R2_ENDPOINT_URL` | Cloudflare R2 S3 endpoint | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | R2 bucket name | `invoiceai-storage` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `ALLOWED_ORIGINS` | CORS allowed origins (JSON array) | `["https://app.vercel.app"]` |
| `EMAIL_ADDRESS` | Gmail address for email ingestion | `invoices@gmail.com` |
| `EMAIL_PASSWORD` | Gmail App Password (not account password) | 16-char app password |

---

## 🔌 API Reference

The FastAPI backend auto-generates interactive documentation:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

Key endpoints:
```
POST /api/v1/auth/register          Register new organization + admin
POST /api/v1/auth/login             Email/password login → JWT
POST /api/v1/auth/google-login      Google OAuth → JWT
POST /api/v1/invoices/upload        Upload invoice file for processing
GET  /api/v1/invoices/my            List user's invoices
GET  /api/v1/invoices/{id}          Get invoice details + AI extraction
POST /api/v1/invoices/{id}/reprocess Re-run AI pipeline on existing invoice
DELETE /api/v1/invoices/{id}        Delete invoice + R2 file
GET  /api/v1/admin/dashboard        Organization analytics
GET  /api/v1/admin/invoices         All org invoices (admin view)
POST /api/v1/admin/invoices/{id}/approve   Manually approve
POST /api/v1/admin/invoices/{id}/reject    Reject with reason
GET  /api/v1/admin/policies/{org_id}       Get audit policy
PUT  /api/v1/admin/policies/{org_id}       Update policy thresholds
GET  /health                               Health check endpoint
```

---

## 📁 Project Structure

```
invoice-ai-cloud/
├── backend/                    # FastAPI Python Backend
│   ├── main.py                 # App entrypoint, CORS, lifespan, health
│   ├── dependencies.py         # DB session, auth dependencies
│   ├── requirements.txt        # All Python dependencies
│   ├── core/
│   │   ├── config.py           # Pydantic settings (env vars)
│   │   ├── security.py         # JWT token creation/verification
│   │   └── logger.py           # Structured logging setup
│   ├── models/
│   │   └── all.py              # SQLAlchemy models (Org, User, Invoice, Policy, Event)
│   ├── api/routes/
│   │   ├── auth.py             # Register, login, Google OAuth
│   │   ├── invoice.py          # Upload, list, reprocess, delete
│   │   └── admin.py            # Dashboard, review queue, policy, analytics
│   └── services/
│       ├── ocr_service.py      # OpenCV → Tesseract extraction
│       ├── llm_service.py      # Groq API prompt engineering + response parsing
│       ├── invoice_service.py  # Orchestration: upload → OCR → LLM → DB
│       ├── storage_service.py  # Cloudflare R2 upload/download/delete
│       ├── email_service.py    # IMAP polling + SMTP replies
│       └── spreadsheet_service.py  # Excel/CSV direct mapping
├── frontend-next/              # Next.js 14 Frontend
│   ├── src/app/
│   │   ├── (client)/           # Client-facing routes
│   │   │   ├── client/dashboard/   # Dashboard with live processing
│   │   │   ├── client/upload/      # Drag-and-drop multi-file upload
│   │   │   ├── client/invoices/    # Invoice list with status tracking
│   │   │   └── client/invoices/[id]/  # Split-screen audit view
│   │   └── (admin)/            # Admin-only routes
│   │       ├── admin/dashboard/    # Org analytics and metrics  
│   │       ├── admin/invoices/     # Review queue management
│   │       ├── admin/clients/      # User management
│   │       └── admin/settings/     # Policy engine configuration
│   ├── src/contexts/AuthContext.tsx  # Google OAuth + JWT management
│   └── src/lib/api-client.ts        # All backend API calls
├── Dockerfile                  # Docker build for Render/cloud deployment
├── render.yaml                 # Render.com IaC config
├── start-tunnel.sh             # One-click: start backend + Cloudflare Tunnel
├── README.md                   # This file
├── ERRORS_AND_STRATEGIES.md    # All bugs encountered + solutions
├── TECHNICAL_SPECIFICATIONS.md # Deep tech spec for every component
└── BRIEF_DOCUMENTATION.md     # Quick quickstart guide
```

---

---

## 🚀 How to Run This Project (Full Step-by-Step Guide)

This guide walks a **complete stranger** through running InvoiceAI Cloud from scratch — from creating cloud accounts to having the live app running in a browser.

---

### 📋 Phase 0 — Prerequisites (Install These First)

Make sure the following are installed on your machine before anything else:

| Tool | Install Command | Verify |
|---|---|---|
| Python 3.10+ | [python.org](https://www.python.org/downloads/) | `python --version` |
| Node.js 18+ | [nodejs.org](https://nodejs.org) | `node --version` |
| Tesseract OCR | `sudo apt install tesseract-ocr tesseract-ocr-eng` | `tesseract --version` |
| Git | `sudo apt install git` | `git --version` |
| Cloudflared | `sudo apt install cloudflared` OR see [cloudflare.com/products/tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) | `cloudflared --version` |

---

### 🌐 Phase 1 — Create Your Cloud Accounts & Get API Keys

You need **four** external services. All have free tiers.

#### 1.1 — Neon.tech (Free PostgreSQL Database)
1. Go to [neon.tech](https://neon.tech) → **Sign Up** (free)
2. Create a new **Project** (any name, e.g. `invoiceai`)
3. In the dashboard, click **"Connection Details"**
4. Copy the **Connection String** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   > ⚠️ Save this — it's your `DATABASE_URL`

#### 1.2 — Groq API (Free LLM — LLaMA 3.3 70B)
1. Go to [console.groq.com](https://console.groq.com) → **Sign Up** (free)
2. Click **"API Keys"** in the sidebar → **"Create API Key"**
3. Copy the key (starts with `gsk_...`)
   > ⚠️ Save this — it's your `GROQ_API_KEY`

#### 1.3 — Cloudflare R2 (Free Object Storage)
1. Go to [cloudflare.com](https://cloudflare.com) → **Sign Up** (free)
2. In the dashboard sidebar go to **R2 Object Storage** → **Create Bucket**
3. Name it (e.g. `invoiceai-storage`) → click **Create**
4. Go to **R2 Overview** page → click **"Manage R2 API Tokens"**
5. Click **"Create API Token"** → set permissions to **"Object Read & Write"** for your bucket → **Create Token**
6. Copy:
   - **Access Key ID** — this is `R2_ACCESS_KEY`
   - **Secret Access Key** — this is `R2_SECRET_KEY`
   - **S3 endpoint** — looks like `https://<account_id>.r2.cloudflarestorage.com` — this is `R2_ENDPOINT_URL`

#### 1.4 — Google OAuth Client ID (for Google Login)
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. Sidebar → **APIs & Services** → **Credentials**
3. Click **"+ Create Credentials"** → **OAuth Client ID**
4. Application type: **Web application**
5. Under **Authorized JavaScript Origins**, add:
   - `http://localhost:3000`
   - `https://your-vercel-app.vercel.app` *(add this after deploying to Vercel)*
6. Click **Create** → Copy the **Client ID**
   > ⚠️ Save this — it's your `GOOGLE_CLIENT_ID`

#### 1.5 — Gmail App Password (for Email Ingestion — optional but recommended)
1. Go to your Gmail account → **Google Account Settings** → **Security**
2. Enable **2-Step Verification** (required)
3. Search for **"App Passwords"** → Create one named `InvoiceAI`
4. Copy the **16-character password**
   > ⚠️ Save this — it's your `EMAIL_PASSWORD`. Your `EMAIL_ADDRESS` is the Gmail address.

---

### 💻 Phase 2 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/invoice-ai-cloud.git
cd invoice-ai-cloud
```

---

### ⚙️ Phase 3 — Backend Setup

```bash
# 1. Navigate into the backend folder
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate it
source venv/bin/activate          # Linux / macOS
# venv\Scripts\activate           # Windows

# 4. Install all Python dependencies
pip install -r requirements.txt

# 5. Copy the example environment file
cp ../.env.example .env
```

Now **open `.env` in any text editor** and fill in all your values:

```env
DATABASE_URL=postgresql://user:password@...neon.tech/neondb?sslmode=require
SECRET_KEY=any-long-random-string-you-make-up
GROQ_API_KEY=gsk_xxx...
R2_ACCESS_KEY=your-r2-access-key-id
R2_SECRET_KEY=your-r2-secret-access-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=invoiceai-storage
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
ALLOWED_ORIGINS=["http://localhost:3000","https://your-vercel-app.vercel.app"]
EMAIL_ADDRESS=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

> 💡 **SECRET_KEY** can be any random string. Generate one with: `python -c "import secrets; print(secrets.token_hex(32))"`

```bash
# 6. Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```

✅ **Success looks like:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> Test it: open [http://localhost:8000/health](http://localhost:8000/health) in your browser. You should see `{"status":"healthy","db":"connected","llm":"configured"}`.

---

### 🌍 Phase 4 — Expose Backend via Cloudflare Tunnel

The tunnel gives your local backend a **public HTTPS URL** so the deployed frontend (Vercel) can reach it.

**Open a new terminal tab** (keep the backend running):

```bash
cloudflared tunnel --url http://localhost:8000
```

✅ **Wait for output like:**
```
2024-xx-xx INF |  https://random-words-here.trycloudflare.com  |
INF Registered tunnel connection connIndex=0
```

📋 **Copy the `https://xxxx.trycloudflare.com` URL** — you'll need it in the next step.

> ⚠️ This URL **changes every time** you restart the tunnel. Keep this terminal open the entire time you're using the app.

---

### 🖥️ Phase 5 — Frontend Setup

Open **another new terminal tab**:

```bash
# 1. Navigate to the Next.js frontend
cd frontend-next

# 2. Install Node.js dependencies
npm install

# 3. Create local environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 4. Start the development server
npm run dev
```

✅ **Success looks like:**
```
▲ Next.js 14.x.x
- Local:   http://localhost:3000
- Ready in Xs
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app should load. You can now use the app **fully locally** (no Vercel needed for local development).

---

### ☁️ Phase 6 — Deploy Frontend to Vercel (for public access)

1. Push your code to GitHub (if you haven't already):
   ```bash
   git add .
   git commit -m "initial setup"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Set **Root Directory** to `frontend-next`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://xxxx.trycloudflare.com` *(your tunnel URL from Phase 4)*
5. Click **Deploy** and wait ~2 minutes
6. Your app will be live at `https://your-project-name.vercel.app` 🎉

> Every time you restart the Cloudflare Tunnel (the URL changes), you must update `NEXT_PUBLIC_API_URL` in Vercel → **Environment Variables** and click **Redeploy**.

---

### 🔄 Phase 7 — Daily Startup (After Initial Setup)

Once you've done the setup once, here's all you need to run each time:

```bash
# Terminal 1 — Start Backend
cd invoice-ai-cloud/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Start Tunnel (new tab)
cloudflared tunnel --url http://localhost:8000
# → Copy the new URL, update Vercel env var if it changed, redeploy

# Terminal 3 — Start Frontend locally (optional — only if not using Vercel)
cd invoice-ai-cloud/frontend-next
npm run dev
```

Or use the provided convenience script:
```bash
./start-tunnel.sh   # Starts both backend + tunnel automatically
```

---

### 🆘 Troubleshooting

| Problem | Solution |
|---|---|
| `Address already in use` on port 8000 | Run `pkill -f "uvicorn"` then restart |
| Tunnel shows `connection refused` errors | Make sure the backend is running first |
| Login fails / "Authentication error" | Tunnel URL changed — update in Vercel and redeploy |
| App loads but shows no data | Check backend health: `curl http://localhost:8000/health` |
| `ModuleNotFoundError` in Python | Activate venv with `source venv/bin/activate` then retry |
| Tesseract not found | Run `sudo apt install tesseract-ocr tesseract-ocr-eng` |
| Google OAuth redirect error | Add your Vercel URL to **Authorized JavaScript Origins** in Google Cloud Console |

---

## 🤝 Authors

Built with obsessive engineering precision.  
For questions, contact: [ashishmullasserymenon75@gmail.com](mailto:ashishmullasserymenon75@gmail.com)

---

## 🚀 How to Run This Project (Complete Setup Guide)

> Follow every step exactly. This project has a **Python backend**, a **Next.js frontend**, and requires several third-party services. Total setup time: ~30 minutes.

---

### 📋 Prerequisites — Install These First

| Tool | Purpose | Install |
|---|---|---|
| Python 3.10+ | Backend runtime | [python.org](https://python.org) |
| Node.js 18+ | Frontend runtime | [nodejs.org](https://nodejs.org) |
| Tesseract OCR | Invoice text extraction | `sudo apt install tesseract-ocr tesseract-ocr-eng` (Linux) / [installer](https://github.com/UB-Mannheim/tesseract/wiki) (Windows) |
| Git | Cloning the repo | `sudo apt install git` |
| Cloudflared | Public HTTPS tunnel | [Download](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) |

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/ashishMenon05/Invoice-AI.git
cd Invoice-AI
```

---

### 2️⃣ Set Up the Backend (Python / FastAPI)

```bash
cd backend

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate          # Windows

# Install all dependencies
pip install -r requirements.txt
```

#### Create the `.env` File

Create a file called `.env` inside the `backend/` folder with the following content:

```env
# ── Database (Neon PostgreSQL recommended — free tier works) ──────────────────
DATABASE_URL=postgresql://user:password@your-neon-host/dbname

# ── Google OAuth (for SSO login) ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── JWT Secret (generate any random 32+ char string) ─────────────────────────
SECRET_KEY=your-super-secret-jwt-key-32-chars-minimum

# ── Groq API (free LLaMA 3.3 70B — get key at console.groq.com) ──────────────
GROQ_API_KEY=gsk_your_groq_api_key

# ── Cloudflare R2 (file storage — free 10GB/month) ───────────────────────────
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name

# ── Gmail (for email invoice ingestion — optional) ───────────────────────────
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# ── Frontend URL (for CORS — your Vercel URL or localhost) ───────────────────
FRONTEND_URL=https://your-app.vercel.app
```

> **Where to get each key:**
> - **DATABASE_URL** → Create a free Postgres DB at [neon.tech](https://neon.tech)
> - **GOOGLE_CLIENT_ID/SECRET** → [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client
> - **GROQ_API_KEY** → [console.groq.com](https://console.groq.com) → API Keys → Create key (free, no credit card)
> - **R2_*** → [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket → API Tokens
> - **GMAIL_APP_PASSWORD** → Gmail → Security → 2FA enabled → App Passwords → Generate

#### Initialize the Database

```bash
# Still inside backend/ with venv active
python -c "from database import engine; from models.all import Base; Base.metadata.create_all(bind=engine); print('DB ready!')"
```

#### Start the Backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
✅ R2 CORS configured for direct browser upload
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### 3️⃣ Set Up the Frontend (Next.js)

Open a **new terminal tab**:

```bash
cd Invoice-AI/frontend-next

# Install dependencies
npm install
```

#### Create the Frontend Environment File

Create `.env.local` inside `frontend-next/`:

```env
# Your backend URL — use your Cloudflare Tunnel URL (see step 4) or localhost
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google OAuth client ID (same one as backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

#### Run the Frontend Locally

```bash
npm run dev
```

Frontend is now at **http://localhost:3000**

---

### 4️⃣ Expose the Backend Publicly (Cloudflare Tunnel)

> This is needed if you want friends/remote users to access your locally-running backend.

Open a **third terminal tab**:

```bash
cloudflared tunnel --url http://localhost:8000
```

You'll see a URL like:
```
Your quick Tunnel has been created! Visit it at:
https://random-words-here.trycloudflare.com
```

**Copy that URL.** Now update your frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://random-words-here.trycloudflare.com
```

Then restart the frontend (`Ctrl+C` → `npm run dev`).

> ⚠️ **Important:** This tunnel URL changes every time you restart cloudflared. For a permanent URL, set up a **Named Tunnel** with a free Cloudflare account.

---

### 5️⃣ Deploy Frontend to Vercel (Recommended)

1. Push your fork to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project → Select your repo
3. Set **Root Directory** to `frontend-next`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = your cloudflare tunnel URL
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your Google client ID
5. Deploy — Vercel auto-rebuilds on every `git push`

---

### 6️⃣ Google OAuth Setup (Required for Login)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web Application**
4. Add to **Authorized JavaScript Origins**:
   - `http://localhost:3000`
   - `https://your-app.vercel.app`
5. Add to **Authorized Redirect URIs**:
   - `http://localhost:3000`
   - `https://your-app.vercel.app`
6. Copy **Client ID** and **Client Secret** into both `.env` files

---

### ✅ Final Checklist

```
[ ] Backend running on port 8000 (uvicorn)
[ ] Frontend running on port 3000 (npm run dev) OR deployed to Vercel
[ ] Cloudflare Tunnel running (if exposing to internet)
[ ] .env file in backend/ with all keys filled
[ ] .env.local in frontend-next/ with API URL pointing to backend
[ ] Tesseract installed (tesseract --version works in terminal)
[ ] Database tables created (no errors on backend startup)
```

### 🆘 Common Problems

| Problem | Fix |
|---|---|
| `tesseract: command not found` | `sudo apt install tesseract-ocr tesseract-ocr-eng` |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` with venv active |
| Google login fails | Add your URL to Google Cloud Console Authorized Origins |
| Upload says "Disconnected from backend" | Tunnel URL changed — update `NEXT_PUBLIC_API_URL` and restart frontend |
| `connection refused` on port 8000 | Backend isn't running — start `uvicorn main:app ...` first |
| Database error on startup | Check `DATABASE_URL` format: `postgresql://user:pass@host/db` |
| R2 upload fails | Verify all 4 R2 env vars are set, bucket exists, and API token has write permission |

