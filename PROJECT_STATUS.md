# 📋 PROJECT STATUS — Weekly Work Log & Progress Tracker

<div align="center">

| **PROJECT TITLE** | **COLLEGE** | **COHORT/BATCH** | **START DATE** |
|---|---|---|---|
| AI-Powered Invoice Automation with Hybrid OCR & LLM Intelligence | Sri Ramakrishna Institute of Technology | 2025–2026 | 21/01/2026 |

</div>

---

## 👥 Team Members

| S.No | Name | Role | Dept. & Roll No |
|---|---|---|---|
| 1 | **Ashiths M Menon** | Project Lead & Full Stack Architect | CSE – 71382302018 |
| 2 | **Dharaneee Dharan** | Full Stack Developer | IT – 71382309010 |
| 3 | **Mohammed Fasil PM** | Frontend Developer | CSE – 71382302096 |
| 4 | **Srinivasan K** | Data Engineer | CSE – 71382302153 |

---

## 🎯 Objective (3 lines)

> To develop an **autonomous invoice processing pipeline** that overcomes traditional OCR limitations (80% accuracy) by using a **Hybrid Smart-Routing Architecture**.  
> The system dynamically classifies documents — routing Digital PDFs to high-speed parsers and Handwritten/Scanned files to a **Multimodal LLM pipeline** (LLaMA 3.3 70B via Groq).  
> Ensuring financial accuracy through **Deterministic Math Validation** and multi-tenant **B2B SaaS** architecture before storage to Cloudflare R2.

---

## 📦 Deliverables

- **Intelligent Ingestion Portal:** A Next.js 14 web dashboard for multi-format invoice upload (PDF, images, Excel, CSV) with drag-and-drop support and real-time AI processing status
- **Hybrid OCR Engine:** A smart classification layer that routes Digital PDFs through `pdfplumber` (instant text extraction) and scanned/handwritten files through OpenCV + Tesseract PSM 6 + LLaMA 3.3 70B
- **Deterministic Validation Module:** A Python post-processing layer that mathematically verifies line items multiply correctly (`unit_price × qty == line_total`) and reconstructs missing Grand Totals via `sum()` to prevent $0 hallucinations
- **Multi-Tenant B2B SaaS Architecture:** PostgreSQL schema anchored by an `Organization` root entity with enforced `org_id` Foreign Key cascades preventing cross-tenant data access
- **Structured Cloud Storage:** Cloudflare R2 (S3-compatible) storing processed invoices as `organizations/{org_id}/invoices/{uuid}_{filename}`, ready for ERP/Multiagent integration

---

## 📅 Weekly Plan / Daily Work Log

### WEEK 1: 21 Jan 2026 – 27 Jan 2026 — *Foundation & Architecture*

| Date | Day | Task Planned | Work Done | Issues Faced | Remarks |
|---|---|---|---|---|---|
| 21-Jan-2026 | Wed | Requirement Analysis & Scope Definition | Defined core problem: OCR accuracy on tabular invoices. Analyzed Hybrid Smart-Routing architecture. Selected Groq (LLaMA 3.3 70B) over local models | Ambiguity on which AI model to use (ColPali vs GPT-4o vs LLaMA) | Decided on Hybrid Routing strategy — Tesseract for images, pdfplumber for digital PDFs |
| 22-Jan-2026 | Thu | Technology Stack Finalization | Selected FastAPI (Backend), Next.js 14 (Frontend), PostgreSQL via Neon.tech, Cloudflare R2 (Storage) | Cost analysis of Vector DBs showed they were unnecessary | Rejected Vector Embeddings based on feedback |
| 23-Jan-2026 | Fri | Python environment setup | Configured virtualenv. Installed `fastapi`, `uvicorn`, `pydantic-settings`, `pytesseract`, `opencv-python-headless`, `pdfplumber`, `groq`, `boto3` | Dependency conflict between `torch` and standard libs | Removed torch — switched to `groq` cloud API entirely |
| 24-Jan-2026 | Sat | Architecture & Data Flow Design | Designed multi-tenant schema: Organization → Users → Invoices → Events. Designed API route structure (`/auth`, `/invoices`, `/admin`) | Which AI model should handle which pipeline stage | Finalized: pdfplumber for digital, Tesseract+LLM for scanned |
| 25-Jan-2026 | Sun | Database Schema Design | Designed SQLAlchemy models: `Organization`, `User`, `Invoice`, `OrganizationPolicy`, `InvoiceEvent`. Wrote migration scripts | Discovered flat single-tenant schema was a security risk | Pivoted to multi-tenant with `org_id` FK cascades |
| 26-Jan-2026 | Mon | Core Backend Scaffolding | Built FastAPI app with CORS, JWT auth, Pydantic settings, dependency injection (`require_client`, `require_admin`) | Understanding Pydantic v2's `extra = 'forbid'` behavior on Settings class | Added all env vars as explicit fields in `Settings` class |
| 27-Jan-2026 | Tue | Storage Layer Setup | Configured `storage_service.py` with boto3 pointing to Cloudflare R2. Tested file upload/download | R2 endpoint URL format was wrong (`/r2.cloudflarestorage.com/account` vs `account.r2...`) | Fixed endpoint URL format to AWS S3-compatible style |

---

### WEEK 2: 28 Jan 2026 – 03 Feb 2026 — *AI Pipeline Development*

| Date | Day | Task Planned | Work Done | Issues Faced | Remarks |
|---|---|---|---|---|---|
| 28-Jan-2026 | Wed | OCR Pipeline Implementation | Built `ocr_service.py`: grayscale → adaptive Gaussian thresholding → Tesseract PSM 6 → raw text | Tesseract default PSM 3 scrambled tabular columns completely | Enforced `--psm 6` to preserve row alignment |
| 29-Jan-2026 | Thu | LLM Integration via Groq | Built `llm_service.py`: structured JSON prompt to LLaMA 3.3 70B. Engineered strict output schema | `groq` + `httpx` version conflict: `TypeError: Client.__init__() got unexpected keyword argument 'proxies'` | Upgraded groq and pinned httpx to compatible version |
| 30-Jan-2026 | Fri | Hybrid Router Implementation | Implemented `invoice_service.py`: PDF type detection → route to pdfplumber OR Tesseract+LLM | Some Digital PDFs falsely detected as scanned due to invisible text layers | Added Text Density Threshold fallback |
| 31-Jan-2026 | Sat | Deterministic Validation Engine | Built math failsafe: if LLM returns `null` for grand_total but line items exist, Python runs `sum(line_totals)` | Floating point errors (e.g. `10.0001 != 10`) | Used `round(value, 2)` via numpy to fix math errors |
| 01-Feb-2026 | Sun | SKU Hallucination Problem Discovery | Tested on hardware invoices. `llama-3.1-8b` model mapped SKU code `9347` as Quantity → single item cost $94,000 | Small model lacks reasoning for financial context | Upgraded to `llama-3.3-70b-versatile` + added heuristic prompt guards |
| 02-Feb-2026 | Mon | Spreadsheet Ingestion Module | Built `spreadsheet_service.py`: pandas reads `.xlsx`/`.csv`, maps columns directly to DB — no AI needed | File format inconsistencies between CSV/PDF and image uploads | Added input validation and file-type checks |
| 03-Feb-2026 | Tue | Admin API & Policy Engine | Built `/admin` routes: dashboard analytics, invoice review queue, `OrganizationPolicy` CRUD with configurable auto-approve thresholds | Cross-tenant data access risk in flat query structure | Injected `org_id` filter into all SQLAlchemy queries via `require_admin` dependency |

---

### WEEK 3: 04 Feb 2026 – 10 Feb 2026 — *Frontend & Full-Stack Integration*

| Date | Day | Task Planned | Work Done | Issues Faced | Remarks |
|---|---|---|---|---|---|
| 04-Feb-2026 | Wed | Next.js Frontend Foundation | Scaffolded Next.js 14 App Router. Built `AuthContext.tsx` with Google OAuth (`@react-oauth/google`) and JWT. Built `api-client.ts` with all API calls | Webpack alias `@/lib/api-client` not resolving | Fixed in `next.config.mjs` with `config.resolve.alias['@']` |
| 05-Feb-2026 | Thu | Client Dashboard & Upload UI | Built drag-and-drop upload page with `Promise.all()` batch uploads. Built invoice list with live status polling | `Promise.all()` with 30 files overwhelmed the server | Replaced with sequential batching (3 at a time) |
| 06-Feb-2026 | Fri | Admin Dashboard with Analytics | Built admin dashboard with Recharts line/bar charts for invoice volume, processing rates, confidence scores | UI froze for 3-5 seconds loading 100+ invoices — 5MB JSON payload | Applied SQLAlchemy `defer(Invoice.extracted_json)` on list queries; time dropped from 4000ms → 150ms |
| 07-Feb-2026 | Sat | Split-Screen Invoice Audit UI | Built `/client/invoices/[id]` split-screen: left pane = original file (Blob stream), right pane = extracted JSON fields with editable inputs | Blob streaming required auth headers on file fetch endpoint | Added auth-protected `/invoices/{id}/file` endpoint returning binary blob |
| 08-Feb-2026 | Sun | Email Ingestion Service | Built `email_service.py`: IMAP Gmail polling via APScheduler (every 60s), finds UNSEEN emails, downloads attachments, runs AI pipeline, sends SMTP confirmation reply | IMAP socket disconnected silently → scheduler crashed | Adopted stateless pattern: open+process+close per poll cycle |
| 09-Feb-2026 | Mon | Async Batch Reprocessing | Wrapped batch reprocess in `BackgroundTasks`. Admin clicks → DB updated instantly → 200 OK returned → AI runs in background thread | Synchronous processing of 50 invoices took 3+ min → HTTP 504 timeout | BackgroundTasks reduced response time from 3min → 50ms |
| 10-Feb-2026 | Tue | Feature Freeze & System Test | Locked all features. Full end-to-end test: upload → OCR → LLM → validate → store → display. Verified admin approve/reject/reprocess | None critical | System ready for deployment phase |

---

### WEEK 4: 11 Feb 2026 – 17 Feb 2026 — *Cloud Deployment & Debugging*

| Date | Day | Task Planned | Work Done | Issues Faced | Remarks |
|---|---|---|---|---|---|
| 11-Feb-2026 | Wed | Docker & Render Deployment | Wrote `Dockerfile` from `python:3.10-slim`. Configured `render.yaml`. Deployed to Render.com | `ModuleNotFoundError: pydantic_settings`, `cv2`, `openpyxl` — missing deps in clean Docker build | Audited all imports, added missing packages to `requirements.txt` |
| 12-Feb-2026 | Thu | Vercel Frontend Deployment | Deployed Next.js frontend to Vercel. Configured `NEXT_PUBLIC_API_URL` pointing to Render backend | Nested Git repo issue — `frontend-next/.git` caused Vercel to treat it as an empty submodule | Deleted nested `.git`, force-added files to parent repo |
| 13-Feb-2026 | Fri | CORS & Environment Configuration | Added Vercel origin to `ALLOWED_ORIGINS`. Fixed env vars in Render dashboard | CORS blocked all Vercel → Render API calls | Added `allow_origin_regex` for `*.vercel.app` domains |
| 14-Feb-2026 | Sat | R2 Storage Debugging | Investigated why uploaded files weren't reaching R2. Found credentials had hidden `\n` characters | `InvalidSignatureError` — HMAC signature mismatch despite correct looking keys | Added `.strip()` to all credential reads in `storage_service.py` |
| 15-Feb-2026 | Sun | R2 Bucket Name Fix | Discovered default bucket name was `invoice-ai-bucket` but actual bucket is `invoiceai-storage` | `AccessDenied` when trying to write to wrong bucket | Added `R2_BUCKET_NAME` as proper Pydantic Settings field; updated all `os.getenv()` calls |
| 16-Feb-2026 | Mon | Render Memory Limit Crisis | Render free tier (512MB RAM) OOM-killed during concurrent OCR processing | 30 simultaneous Tesseract processes exhausted memory → server killed | Implemented batched uploads (3 at a time) in frontend. Still insufficient for free tier |
| 17-Feb-2026 | Tue | Decision: Abandon Render → Local Laptop | Render free tier permanently unviable for OCR at any real volume | Cold starts (50s), 512MB RAM, no persistent storage | **Strategic Pivot:** Use local laptop (16GB RAM) as backend via Cloudflare Tunnel |

---

### WEEK 5: 18 Feb 2026 – 02 Mar 2026 — *Cloudflare Tunnel Deployment & Final Polish*

| Date | Day | Task Planned | Work Done | Issues Faced | Remarks |
|---|---|---|---|---|---|
| 18-Feb-2026 | Wed | Cloudflare Tunnel Setup | Installed `cloudflared`. Reverted Tesseract paths from Docker paths to local paths (`/home/ashish/python/bin/tesseract`) | `pydantic_core.ValidationError: R2_BUCKET_NAME extra inputs not permitted` on backend startup | Added `R2_BUCKET_NAME` field to Settings class |
| 19-Feb-2026 | Thu | Tunnel + Vercel Integration | Ran `cloudflared tunnel --url http://localhost:8000`. Got `https://vids-exec-tunnel-level.trycloudflare.com`. Updated Vercel env var | Tunnel failing with `control stream encountered a failure` — backend wasn't running yet | Established correct startup order: uvicorn FIRST, then cloudflared |
| 20-Feb-2026 | Fri | Full System Test on Live Deployment | Tested full flow on `invoice-ai-ashy.vercel.app`: login, upload, AI extraction, admin review, reprocess | Old invoices stuck in "Processing" — files were on Render's local disk which no longer exists | Ran `clean_stuck_invoices.py` — deleted 60 orphaned DB records |
| 21-Feb-2026 | Sat | Reprocess & Delete Button Fixes | Fixed `api-client.ts` to read actual backend error messages from response body | Reprocess showing generic "Reprocess failed" with no explanation | Updated `deleteInvoice` and `reprocessInvoice` to read `err.detail` from response JSON |
| 22-Feb-2026 | Sun | Documentation — Phase 1 | Wrote comprehensive `README.md` (architecture diagram, tech stack, API reference), `ERRORS_AND_STRATEGIES.md` (19 documented bugs), `BRIEF_DOCUMENTATION.md` (quickstart) | — | Pushed to GitHub with all screenshots in `assets/screenshots/` |
| 23-Feb-2026 | Mon | GitHub README — Screenshots | Restructured README screenshots into 2-column HTML tables: Client View (4 screenshots) + Admin View (6 screenshots) | Old screenshots had error states visible | Replaced with clean screenshots from live working deployment |
| 24-Feb-2026 | Tue | `RUNNING_GUIDE.md` | Wrote step-by-step start/stop instructions: startup order, health check commands, troubleshooting table | Tunnel URL changes every restart → Google OAuth breaks | Documented the issue + permanent fix (named tunnel via `cloudflared login`) |
| 02-Mar-2026 | Sun | Session Recovery & Final Test | Killed stale uvicorn (port conflict), restarted backend + new tunnel. Updated Vercel with new URL `ballet-keeping-registrar-beverly.trycloudflare.com` | Backend was not running when tunnel started — repeated connection failures | **Rule established:** Always start uvicorn before cloudflared |

---

## 🐛 Major Issues Encountered (Summary)

| # | Issue | Root Cause | Fix Applied |
|---|---|---|---|
| 1 | OCR scrambled tabular columns | Default Tesseract PSM 3 reads vertically | Enforced `--psm 6` (single block mode) |
| 2 | SKU codes mapped as Quantities ($94,000 tape) | `llama-3.1-8b` lacked financial reasoning | Upgraded to `llama-3.3-70b` + heuristic prompt guards |
| 3 | `$0` Grand Total on cropped invoices | LLM returned `null` when total was missing | Python `sum(line_totals)` failsafe after LLM |
| 4 | Admin dashboard freezing (5MB JSON) | `SELECT *` fetching heavy `extracted_json` column | SQLAlchemy `defer(Invoice.extracted_json)` |
| 5 | HTTP 504 on batch reprocessing | Synchronous OCR for 50 invoices took 3+ min | `BackgroundTasks` → instant 200 OK |
| 6 | IMAP polling crashed silently | Persistent IMAP connection rotted | Stateless open+process+close per poll |
| 7 | Single-tenant security risk | No Organization entity | Mid-flight org_id FK cascade re-architecture |
| 8 | Docker build missing modules | Incomplete `requirements.txt` | Full dependency audit |
| 9 | `proxies` TypeError on Groq client | groq + httpx version conflict | Pinned compatible versions |
| 10 | Tesseract path wrong in Docker | Hardcoded local path | Env-var override for Docker environments |
| 11 | R2 `InvalidLocationConstraint` | Wrong endpoint URL format | Fixed to `account-id.r2.cloudflarestorage.com` |
| 12 | R2 `AccessDenied` | Wrong default bucket name | Added `R2_BUCKET_NAME` to Pydantic Settings |
| 13 | R2 `InvalidSignatureError` | Hidden `\n` in copy-pasted credentials | `.strip()` on all credential reads |
| 14 | CORS blocked Vercel → Backend | Missing Vercel URL in `ALLOWED_ORIGINS` | Added `allow_origin_regex` for `*.vercel.app` |
| 15 | Render OOM crashes on OCR | 512MB RAM + 30 concurrent Tesseract processes | Frontend batching (3 at a time) |
| 16 | Render permanently unsuitable | Free tier memory/cold start limits | **Switched to Cloudflare Tunnel + local laptop** |
| 17 | Nested Git repo — Vercel empty build | `frontend-next/.git` treated as submodule | Deleted nested `.git`, force-added files |
| 18 | Webpack `@/lib` alias not resolving | Next.js config missing alias | Added `config.resolve.alias['@']` in `next.config.mjs` |
| 19 | Pydantic rejected env var | `extra = 'forbid'` on Settings class | Declared every env var as explicit field |
| 20 | 60 invoices stuck in "Processing" | Files saved to Render disk — no longer exist | Deleted orphaned records via `clean_stuck_invoices.py` |
| 21 | Backend "Address already in use" | Stale uvicorn process not killed before restart | `pkill -f "uvicorn main:app"` then restart |
| 22 | Tunnel "control stream failure" | cloudflared started before uvicorn was ready | Startup order documented: uvicorn first |

---

## ✅ Final Deployment Status

| Component | Technology | Host | Status |
|---|---|---|---|
| **Frontend** | Next.js 14 | Vercel | ✅ Live |
| **Backend API** | FastAPI + Uvicorn | Local Laptop (Ashiths) | ✅ Running |
| **Database** | PostgreSQL | Neon.tech (Serverless) | ✅ Connected |
| **File Storage** | Cloudflare R2 | Cloudflare Global CDN | ✅ Operational |
| **Public Tunnel** | Cloudflare Tunnel | trycloudflare.com | ✅ Active |
| **AI Engine** | LLaMA 3.3 70B | Groq Cloud API | ✅ Configured |
| **Email Polling** | Gmail IMAP | APScheduler (60s) | ✅ Running |

**Live App:** [https://invoice-ai-ashy.vercel.app](https://invoice-ai-ashy.vercel.app)
