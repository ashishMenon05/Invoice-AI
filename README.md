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

## 🖼️ Screenshots

### Client Dashboard
![Client Dashboard](./assets/screenshots/client_dashboard.png)
*Real-time invoice processing pipeline with status tracking*

### Upload Interface
![Upload Interface](./assets/screenshots/client_upload.png)
*Drag-and-drop multi-file upload with batch processing support*

### My Invoices
![My Invoices](./assets/screenshots/client_invoices.png)
*Full invoice list with AI-extracted data, confidence scores, and audit trail*

### Admin Dashboard
![Admin Dashboard](./assets/screenshots/admin_dashboard.png)
*Organization-wide analytics — volume trends, processing rates, confidence distributions*

### Admin Invoice Queue
![Admin Invoice Queue](./assets/screenshots/admin_invoices.png)
*Review queue for low-confidence invoices requiring human verification*

### Policy Engine
![Policy Engine](./assets/screenshots/admin_policies.png)
*Per-organization audit policies — auto-approve thresholds, duplicate detection, fraud flags*

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

## 🤝 Authors

Built with obsessive engineering precision.  
For questions, contact: [ashishmullasserymenon75@gmail.com](mailto:ashishmullasserymenon75@gmail.com)
