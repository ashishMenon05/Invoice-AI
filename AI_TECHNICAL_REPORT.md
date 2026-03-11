# InvoiceAI — AI Technical Architecture Report

> **For AI Assistants & Future Developers:** This document is intended to be fully self-contained. Every API, framework, service, design decision, problem encountered, and resolution is documented here so any AI tool or human developer can fully understand the system without needing prior context.

---

## 🏗️ High-Level Architecture

```
[Client Browser / Vercel Frontend]
         |
         | HTTPS (via Cloudflare Tunnel public URL)
         |
[Python FastAPI Backend — Running on Developer Laptop]
         |
    ┌────┴──────────────────────────────────────────┐
    │                                               │
[Neon PostgreSQL DB]                   [Cloudflare R2 Storage]
    │                                               │
    └────────────────────────────────────────────┐  │
                                                 │  │
                                      [Groq LLM API (Llama 3)]
                                      [Tesseract OCR (local)]
                                      [APScheduler (email poll)]
                                      [IMAP Gmail (email fetch)]
```

**Key principle:** The frontend is a purely static/server-rendered Next.js app deployed on Vercel. 100% of business logic lives in the Python backend. The backend is currently hosted locally and exposed to the internet via a Cloudflare Tunnel, meaning the laptop must remain running for the system to be accessible externally.

---

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime language |
| FastAPI | Latest | Web framework for REST APIs |
| SQLAlchemy | 2.x | ORM for database management |
| Pydantic | v2 | Request/Response data validation |
| Alembic | Latest | Database migrations (schema management) |
| Uvicorn | Latest | ASGI server (runs FastAPI) |
| APScheduler | 3.x | Background job scheduling (email polling) |
| pytesseract | Latest | Python wrapper for Tesseract OCR |
| pdfplumber | Latest | PDF text extraction |
| OpenCV (cv2) | Latest | Image preprocessing for OCR enhancement |
| openpyxl | Latest | Excel file parsing (XLSX support) |
| groq | Latest | SDK for the Groq LLM API |
| passlib[bcrypt] | Latest | Password hashing |
| python-jose | Latest | JWT token generation and verification |
| google-auth | Latest | Google OAuth token verification |
| boto3 | Latest | AWS-compatible SDK for Cloudflare R2 |
| slowapi | Latest | Rate limiting middleware for FastAPI |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.3 | React-based web framework (SSR + Static) |
| React | 18.x | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| TailwindCSS | 3.x | Utility-first CSS framework |
| shadcn/ui | Latest | Pre-built accessible UI components |
| Google Identity API | Latest | One-tap Google login |

### Infrastructure
| Service | Purpose |
|---|---|
| Neon.tech | Serverless PostgreSQL database (cloud-hosted) |
| Cloudflare R2 | Object storage for uploaded invoice files |
| Cloudflare Tunnel | Exposes local backend to the public internet |
| Vercel | Frontend deployment and hosting |
| Groq Cloud | Hosted LLM inference API |
| Gmail IMAP | Email inbox polling for invoice ingestion |

---

## 🤖 AI & ML Pipeline

### Stage 1: OCR (Tesseract + OpenCV)
Tesseract OCR is configured with `--oem 3` and `--psm 6` (Assume a single uniform block of text).
Before OCR, OpenCV processes images via:
1. Grayscale Conversion
2. Adaptive Binarization (`cv2.adaptiveThreshold` with Gaussian method)

### Stage 2: LLM Structuring (Groq / Llama 3.3 70B)
The raw OCR text is passed to Llama 3.3 70B via the Groq API with `temperature=0` and a forced `json_object` format. 
**Key Prompt Engineering Rules:**
- **Tabular OCR Warning:** Do not eagerly associate scrambled numbers with adjacent text.
- **European Decimal Formatting:** Commas (`,`) are converted to periods (`.`). `5,00` becomes `5.0`.
- **Zero Quantity Hallucination:** Massive integers are SKU codes, not quantities. Uses `total / unit_price` math to verify.
- **Strict Line Math:** Enforces `qty * unit_price == line_total`.

### Stage 3: Intelligence Engine & Policies
- **Duplicate Detection:** SHA-256 hashes of OCR text prevent processing duplicates.
- **Fraud Heuristics:** Detects suspiciously round numbers, missing fields, or absurd totals.
- **Validation Score:** Ranks extraction accuracy from 0.0 to 1.0. If above the org's threshold (e.g., 0.95), the invoice is `AUTO_APPROVED`.

---

## 🗄️ Database Schema (Neon PostgreSQL)

### Tables
1. **organizations:** The root tenant (UUID `id`).
2. **users:** Belongs to `organization_id`. Handled via Google OAuth JIT provisioning.
3. **organization_policies:** Configures auto-approve thresholds, duplicate rules, and AI auditor settings.
4. **invoices:** Stores extracted JSON, confidence scores, processing time, and the R2 `file_url`.
5. **invoice_events:** Immutable audit log tracking every action (`PROCESSING_STARTED`, `APPROVED`, etc).

---

## ⚠️ Errors Faced & Resolutions

1. **Oracle Cloud Limit Exceeded:** Attempted to deploy an Oracle VM, hit free-tier VCN limits. Abandoned for Cloudflare Tunnels local hosting.
2. **Google Auth CORS on Vercel:** Next.js aggressively caches `NEXT_PUBLIC_API_URL`. Fixed by force-redeploying Vercel whenever the Cloudflare tunnel restarts.
3. **FastAPI Thread Starvation (Race Condition):** 5 concurrent uploads triggered 5 Groq streams. Added `threading.Lock()` to `invoice_service.py` to enforce sequential FIFO processing.
4. **Infinite Tesseract Hanging:** Corrupted images caused infinite processing loops. Added `concurrent.futures.ThreadPoolExecutor` with a strict `timeout=180` (3 minutes).
5. **AI European Decimal Mutilation:** LLM treated `5,00` as `500`. Fixed by adding explicit comma-decimal translation rules to the LLM prompt template.
6. **Vercel Build Failure (Missing Lib Folder):** Root `.gitignore` had `lib/` which ignored `src/lib/` on frontend. Changed to `/lib/`.
7. **Vercel Build Failure (TypeScript):** Vercel `--strict` mode failed on unused variables. Fixed via `ignoreBuildErrors: true` in `next.config.mjs`.
