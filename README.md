# InvoiceAI — Comprehensive Project Documentation

> **For AI Assistants & Future Developers:** This document is intended to be fully self-contained. Every API, framework, service, design decision, problem encountered, and resolution is documented here so any AI tool or human developer can fully understand the system without needing prior context.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend — Python/FastAPI Deep Dive](#4-backend--pythonfastapi-deep-dive)
5. [Frontend — Next.js Deep Dive](#5-frontend--nextjs-deep-dive)
6. [AI & ML Pipeline](#6-ai--ml-pipeline)
7. [Database Schema](#7-database-schema)
8. [Storage — Cloudflare R2](#8-storage--cloudflare-r2)
9. [Authentication System](#9-authentication-system)
10. [Email Ingestion Pipeline](#10-email-ingestion-pipeline)
11. [Intelligence Engine](#11-intelligence-engine)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Environment Configuration](#13-environment-configuration)
14. [API Reference](#14-api-reference)
15. [Errors Faced & Resolutions](#15-errors-faced--resolutions)
16. [Decisions & Trade-offs Log](#16-decisions--trade-offs-log)
17. [Data Flow Walkthrough](#17-data-flow-walkthrough)

---

## 1. Project Overview

**InvoiceAI** is a multi-tenant, SaaS-style automated invoice processing application. The system allows client users to upload financial documents (invoices, receipts) in various formats (PDF, JPG, PNG, XLSX, CSV). A hybrid OCR and LLM pipeline extracts key financial data from these documents. The extracted data is then evaluated by a configurable business rules engine ("Policy Engine") to automatically approve, reject, or route invoices for human review — all without manual data entry.

### Core Value Propositions

- **Autonomous Processing:** Invoices are routed without human interaction when confidence is high.
- **Multi-Tenancy:** Every organization's data is completely isolated. Policies are per-organization.
- **Hybrid Extraction:** Uses both classical OCR (Tesseract) and a large language model (Llama 3) for cross-validated extraction.
- **Email Ingestion:** Users can simply email their invoices to a designated address and the system automatically picks them up.
- **AI Auditor:** A secondary LLM review pass is optionally run on flagged invoices.
- **Full Audit Trail:** Every action taken on every document is logged immutably in an `invoice_events` table.

---

## 2. High-Level Architecture

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

## 3. Technology Stack

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
| Pillow (PIL) | Latest | Image loading and manipulation |
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
| Recharts | Latest | Data visualization (analytics charts) |
| Google Identity API | Latest | One-tap Google login |
| js-cookie | Latest | Cookie management for auth tokens |

### Infrastructure & External Services
| Service | Purpose |
|---|---|
| Neon.tech | Serverless PostgreSQL database (cloud-hosted) |
| Cloudflare R2 | Object storage for uploaded invoice files |
| Cloudflare Tunnel (cloudflared) | Exposes local backend to the public internet |
| Vercel | Frontend deployment and hosting |
| Groq Cloud | Hosted LLM inference API |
| Gmail IMAP | Email inbox polling for invoice ingestion |
| Google OAuth 2.0 | User authentication via Google accounts |

---

## 4. Backend — Python/FastAPI Deep Dive

### Project Structure

```
backend/
├── main.py                     # FastAPI app entrypoint, CORS, lifespan, scheduler
├── dependencies.py             # Database session factory (SessionLocal, engine)
├── requirements.txt            # Python package dependencies
│
├── core/
│   ├── config.py               # Pydantic Settings — reads all environment variables
│   ├── logger.py               # Centralized logging configuration
│   ├── limiter.py              # SlowAPI rate limiter instance
│   └── security.py             # Password hashing, JWT creation and verification
│
├── api/routes/
│   ├── auth.py                 # /auth endpoints (login, register, Google OAuth)
│   ├── invoice.py              # /invoices endpoints (upload, status, list)
│   └── admin.py                # /admin endpoints (review, analytics, users, policies)
│
├── models/
│   ├── base.py                 # SQLAlchemy declarative base
│   └── all.py                  # All ORM models (Organization, User, Invoice, etc.)
│
├── schemas/
│   ├── user.py                 # Pydantic schemas for User request/response
│   └── invoice_schema.py       # Pydantic schemas for Invoice request/response
│
├── services/
│   ├── invoice_service.py      # Core invoice background processing pipeline
│   ├── llm_service.py          # Groq LLM integration and prompt engineering
│   ├── ocr_service.py          # Tesseract OCR pipeline with OpenCV preprocessing
│   ├── storage_service.py      # Cloudflare R2 upload/download/presigned URL logic
│   ├── email_service.py        # IMAP Gmail polling, attachment ingestion, SMTP sending
│   ├── intelligence_service.py  # Hashing, duplicate detection, fraud heuristics
│   ├── ai_auditor_service.py   # Secondary LLM review for flagged invoices
│   ├── policy_engine.py        # Per-org configurable business rules
│   ├── validation_service.py   # Confidence scoring of LLM output
│   ├── analytics_service.py    # Data aggregation for admin analytics dashboard
│   └── spreadsheet_service.py  # Excel/CSV export of invoice data
│
└── utils/
    ├── json_cleaner.py         # Strips markdown artifacts from LLM responses
    └── math_validator.py       # Validates and corrects line-item math
```

### `main.py` — Application Entrypoint

FastAPI is initialized with a `lifespan` context manager (startup/shutdown pattern). On startup:
1. Tesseract OCR is configured with the correct binary path.
2. A default admin user (`admin@invoiceai.com`) is provisioned if it doesn't exist.
3. Cloudflare R2 CORS rules are applied so browsers can PUT files directly.
4. APScheduler is started with a 60-second interval job to poll Gmail.

CORS middleware allows requests from:
- `http://localhost:3000` and `http://localhost:3001` (local development)
- `https://invoice-ai-ashy.vercel.app` (Vercel production)
- Any `*.vercel.app` subdomain (Vercel preview deployments, via regex)

Rate limiting is applied globally via SlowAPI.

### `core/config.py` — Configuration Management

Uses `pydantic-settings` to read all configuration from a `.env` file. Key settings:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `GROQ_API_KEY` — Groq API credentials
- `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ENDPOINT_URL`, `R2_BUCKET_NAME` — Cloudflare R2 credentials
- `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, `EMAIL_IMAP_SERVER` — Gmail IMAP credentials
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `ALLOWED_ORIGINS` — JSON list of allowed CORS origins
- `TESSERACT_CMD`, `TESSDATA_PREFIX` — System paths for Tesseract OCR

### `invoice_service.py` — The Processing Pipeline

This is the most critical service. It orchestrates the entire extraction pipeline.

**Key Functions:**

- **`create_invoice_with_background_processing()`:** Called by the API route. Creates an `PROCESSING` database record immediately and registers the processing job as a FastAPI `BackgroundTask`.
- **`_process_invoice_background()`:** The actual background worker. It:
  1. Uploads the raw file to Cloudflare R2.
  2. Acquires a `global_processing_lock` (`threading.Lock`) to ensure **sequential** processing of multiple concurrent uploads.
  3. Dispatches `_run_extraction_pipeline()` via a `ThreadPoolExecutor` with a **180-second (3-minute) hard timeout**.
  4. If `TimeoutError` is raised, marks the invoice as `PROCESSING_FAILED` and releases the lock.
- **`_run_extraction_pipeline()`:** The isolated core AI logic:
  1. Calls `ocr_service.extract_text_from_file()` to get raw text.
  2. Calls `intelligence_service.create_text_hash()` for SHA-256 deduplication hash.
  3. Calls `llm_service.extract_invoice_data_with_llm()` to structure the text.
  4. Calls `validation_service.validate_and_score()` to get confidence score.
  5. Calls `intelligence_service.check_for_duplications()` and `calculate_fraud_signals()`.
  6. Calls `policy_engine.evaluate_policy()` to determine final approval status.
  7. Optionally calls `ai_auditor_service.perform_ai_auto_review()` for flagged items.
  8. Sends email notifications via `email_service`.

**Sequential Processing (Critical Design Decision):**
When multiple invoices are uploaded simultaneously, each spawns a `BackgroundTask`. These tasks all run in parallel threads managed by Starlette. Without a lock, they all simultaneously call the Groq API and Tesseract, causing rate-limit errors and CPU thrashing. The global lock ensures FIFO sequential processing — Invoice 2 waits for Invoice 1 to fully complete before it starts.

---

## 5. Frontend — Next.js Deep Dive

The frontend is a Next.js 14 App Router application written in TypeScript with TailwindCSS and shadcn/ui components.

### Application Structure

```
frontend-next/src/
├── app/
│   ├── page.tsx                        # Root redirect (checks auth, routes to dashboard)
│   ├── layout.tsx                      # Root layout (wraps with Providers)
│   ├── globals.css                     # Global styles, Tailwind base
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx              # Login page (email/password + Google One-Tap)
│   │   └── register/page.tsx           # Registration page
│   │
│   ├── (admin)/admin/
│   │   ├── dashboard/page.tsx          # Admin KPI summary dashboard
│   │   ├── invoices/page.tsx           # All invoices list with filters
│   │   ├── invoices/[id]/page.tsx      # Individual invoice detail + review panel
│   │   ├── analytics/page.tsx          # Charts: processing rates, status distribution
│   │   ├── clients/page.tsx            # User management table
│   │   ├── policies/page.tsx           # Policy configuration form per org
│   │   └── settings/page.tsx           # Admin account settings
│   │
│   └── (client)/client/
│       ├── dashboard/page.tsx          # Client summary: stats + recent invoices
│       ├── upload/page.tsx             # Drag-and-drop multi-file upload UI
│       ├── invoices/page.tsx           # Client-only invoice list
│       ├── invoices/[id]/page.tsx      # Invoice detail with extracted data + events
│       └── settings/page.tsx           # Client account settings
│
├── components/
│   ├── AppSidebar.tsx                  # Responsive role-aware navigation sidebar
│   ├── Navbar.tsx                      # Top bar with user avatar and logout
│   ├── StatusBadge.tsx                 # Color-coded invoice status pill
│   ├── ConfidenceBar.tsx               # Animated AI confidence score bar
│   ├── KPIStatCard.tsx                 # Animated statistics card
│   └── ui/                             # shadcn/ui generated components
│
├── contexts/
│   ├── AuthContext.tsx                 # Global auth state (JWT, user object, Google login)
│   └── SidebarContext.tsx              # Sidebar open/collapsed state
│
├── hooks/
│   ├── useInvoiceStatus.ts             # Polling hook: polls /invoices/{id} every 3s until done
│   └── use-toast.ts                     # Toast notification hook
│
├── lib/
│   ├── api-client.ts                   # Typed Axios-based API client (all endpoints)
│   ├── mock-data.ts                    # Fallback mock data for development
│   └── utils.ts                        # cn() utility (TailwindCSS class merging)
│
├── middleware.ts                       # Next.js middleware for route protection (checks JWT cookie)
└── types/index.ts                      # All TypeScript type definitions
```

### Authentication Flow (Frontend)

1. User visits `/login`.
2. If they click "Sign in with Google", the Google Identity API returns a JWT credential.
3. This JWT is POSTed to the backend's `/api/v1/auth/google`.
4. The backend verifies the JWT, provisions the user, returns an app JWT.
5. The app JWT is stored as an `auth_token` cookie and in `AuthContext`.
6. Next.js middleware (`middleware.ts`) validates the cookie on every route change and redirects unauthenticated users to `/login`.

### Multi-File Upload Flow

The `upload/page.tsx` allows drag-and-drop or click-to-browse for **multiple files simultaneously**. For each selected file:
1. The frontend calls `/invoices/upload` with the file as `multipart/form-data`.
2. The backend immediately returns a `201` with the new `invoice_id`.
3. The `useInvoiceStatus` hook begins polling `/invoices/{invoice_id}` every 3 seconds.
4. The UI shows a spinning `Processing...` state for each invoice.
5. Once the backend status changes from `PROCESSING` to its final state, the UI updates the card in real-time.

---

## 6. AI & ML Pipeline

### Stage 1: OCR (Tesseract + OpenCV)

**Service:** `ocr_service.py`

Tesseract OCR is the system's text extraction foundation. It is configured with:
- `--oem 3` (LSTM-only engine, most accurate)
- `--psm 6` (Assume a single uniform block of text)

**Preprocessing (OpenCV):**
Before passing any image to Tesseract, OpenCV preprocessing improves accuracy:
1. Convert to Grayscale (`cv2.cvtColor`)
2. Adaptive Binarization (`cv2.adaptiveThreshold` with Gaussian method) — converts the image to pure black-and-white, removing artifacts, shadows, and color noise.

**Format Handling:**
- **PDF:** First attempts digital text extraction via `pdfplumber`. If the extracted text is less than 50 characters (indicating a scanned/image PDF), falls back to rendering each page as an image at 200 DPI and running OCR on that.
- **JPG/PNG:** Direct OpenCV preprocessing + Tesseract pass with a 30-second timeout.
- **XLSX:** `openpyxl` reads all worksheets and renders each row as tab-separated text, mimicking a tabluar document the LLM can understand.
- **CSV:** Decoded directly as UTF-8 text.

### Stage 2: LLM Structuring (Groq / Llama 3.3 70B)

**Service:** `llm_service.py`
**Model:** `llama-3.3-70b-versatile` via the Groq API
**Temperature:** `0` (fully deterministic, no randomness)
**Response Format:** Forced `json_object` via the Groq API parameter

The raw OCR text (which is unstructured and noisy) is passed to the LLM with a highly engineered prompt. The prompt teaches the LLM specific lessons we learned from real invoice failures:

**Prompt Engineering — Key Rules:**

1. **Tabular OCR Warning:** OCR reads tables column-by-column not row-by-row. The LLM must logically re-associate scrambled columns.
2. **European Decimal Formatting:** European invoices use `5,00` to mean `5.0` (not `500`). The LLM must convert comma-decimals to period-decimals in all JSON float fields.
3. **Zero Quantity Hallucination Policy:** Very large integers in a `qty` field (like `59381`) are Item IDs / SKU codes, NOT quantities. The LLM uses reverse math (`line_total / unit_price = qty`) to deduce the true quantity.
4. **Strict Line Math:** Every line item must satisfy `qty * unit_price == line_total`. If it doesn't, the LLM must re-examine its extraction.
5. **Grand Total Fallback:** If the total is illegible/missing from OCR, the LLM calculates it from the sum of `line_total` values.

**Output Schema:**
```json
{
  "vendor_name": "string",
  "seller_tax_id": "string",
  "client_name": "string",
  "client_tax_id": "string",
  "invoice_number": "string",
  "invoice_date": "string",
  "subtotal": 0.00,
  "tax": 0.00,
  "grand_total": 0.00,
  "line_items": [
    {
      "description": "string",
      "qty": 1.0,
      "unit_price": 0.00,
      "line_total": 0.00
    }
  ]
}
```

**Failsafe Post-Processing:**
After receiving the LLM response, Python applies arithmetic failsafes:
- If `grand_total` is `0` or `null` but line items were extracted, calculate the total from `sum(line_total)`.
- If `subtotal` is missing, default it to `grand_total`.

### Stage 3: Validation & Confidence Scoring

**Service:** `validation_service.py`

Scores the LLM output from 0.0 to 1.0 based on how many fields were successfully extracted:
- `vendor_name` present: +0.15
- `invoice_number` present: +0.15
- `invoice_date` present: +0.1
- `grand_total` > 0: +0.2
- Line items extracted: +0.2
- All line item fields complete: +0.2

The `confidence_score` is persisted on the `Invoice` record and is the primary signal for the Policy Engine.

### Stage 4: AI Auditor (Secondary LLM Review)

**Service:** `ai_auditor_service.py`

When an invoice is flagged as `UNDER_REVIEW`, and if the organization's policy has `ai_auto_review_enabled = True`, a secondary LLM call is made to perform an autonomous audit. The auditor re-reads the raw OCR text and the extracted JSON together, then issues a `PASS`, `FAIL`, or `UNCERTAIN` verdict with a reasoning string. This is effectively a "second opinion" AI reviewer.

---

## 7. Database Schema

**Database:** Neon.tech Serverless PostgreSQL
**ORM:** SQLAlchemy with declarative models in `models/all.py`

### Tables

#### `organizations`
Root tenant entity. Everything in the system belongs to an organization.
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (String) | Primary Key |
| `name` | String | Organization display name |
| `created_at` | DateTime | Auto-populated |

#### `organization_policies`
Per-tenant configurable approval policy. Auto-created on first upload.
| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `organization_id` | UUID | FK → organizations | Unique per org |
| `auto_approve_confidence_threshold` | Float | 0.95 | Approve if confidence >= this |
| `max_auto_approve_amount` | Float | 50000.00 | Auto-approve only up to this amount |
| `high_value_escalation_threshold` | Float | 100000.00 | Escalate to senior review above this |
| `require_review_if_duplicate` | Boolean | true | Force review if duplicate detected |
| `require_review_if_fraud_flag` | Boolean | true | Force review if fraud signals |
| `ai_auto_review_enabled` | Boolean | false | Enable the secondary AI auditor |

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | String | Unique, indexed |
| `hashed_password` | String | BCrypt hashed |
| `role` | Enum | `admin` or `client` |
| `organization_id` | UUID | FK → organizations |
| `full_name` | String | Auto-populated from Google OAuth |
| `avatar_url` | String | Google profile picture URL |
| `is_active` | Boolean | Soft-disable account |

#### `invoices`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `file_url` | String | R2 key (e.g. `org_id/invoice_id/filename.pdf`) |
| `status` | Enum | `PROCESSING`, `AUTO_APPROVED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PROCESSING_FAILED` |
| `organization_id` | UUID | FK → organizations |
| `uploaded_by` | UUID | FK → users |
| `vendor_name` | String | Extracted by LLM |
| `invoice_number` | String | Extracted by LLM |
| `total_amount` | Float | Extracted grand total |
| `confidence_score` | Float | 0.0 to 1.0 |
| `extracted_json` | JSON | Full raw LLM extraction snapshot |
| `duplicate_flag` | Boolean | Set if duplicate detected |
| `fraud_flag` | Boolean | Set if fraud heuristics triggered |
| `fraud_score` | Float | 0 to 100 |
| `text_hash` | String | SHA-256 of raw OCR text |
| `processing_time_seconds` | Float | Wall-clock time for AI pipeline |

#### `invoice_events`
Immutable audit log. Every status change, error, or action creates a new row.
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `invoice_id` | UUID | FK → invoices |
| `performed_by` | UUID | FK → users (null for system events) |
| `event_type` | String | e.g. `UPLOADED`, `PROCESSING_STARTED`, `APPROVED`, `REJECTED`, `FRAUD_SIGNAL`, `DUPLICATE_DETECTED`, `TIMEOUT` |
| `message` | Text | Human-readable explanation |
| `created_at` | DateTime | Auto-populated |

---

## 8. Storage — Cloudflare R2

**Service:** `storage_service.py`
**SDK:** `boto3` (the Cloudflare R2 API is S3-compatible)

### Storage Strategy

Files are stored with the following key structure:
```
{organization_id}/{invoice_id}/{filename}.{ext}
```
This provides natural multi-tenant data isolation at the storage layer.

### Operations

- **Upload:** Uploads raw file bytes immediately after the background task starts, before OCR begins.
- **Presigned Download URLs:** Generated on-the-fly when a user opens an invoice detail page. URLs expire after 15 minutes. This means the frontend never has direct API-key-level access to R2.
- **R2 CORS Configuration:** Applied on server startup via `configure_r2_cors()`. This allows the browser to `PUT` files directly to R2 if using presigned upload URLs.

---

## 9. Authentication System

**Service:** `auth.py`, `core/security.py`

### Email/Password Authentication

1. Passwords are hashed with BCrypt via `passlib`.
2. Successful login generates a JWT (JSON Web Token) signed with `SECRET_KEY` using HS256 algorithm.
3. JWT payload contains `sub` (user id), `role`, and `exp` (expiration — 7 days).
4. The JWT is returned to the frontend and stored as an HTTP cookie (`auth_token`) and in React context.
5. All protected backend endpoints use a `get_current_user` FastAPI dependency that validates the JWT from the `Authorization: Bearer` header.

### Google OAuth Authentication

1. The frontend loads the Google Identity API script.
2. On "Sign in with Google", Google returns a credential (JWT oidc token) to the frontend callback.
3. The frontend POSTs this credential to `/api/v1/auth/google`.
4. The backend calls `google.oauth2.id_token.verify_oauth2_token()` to cryptographically verify the Google JWT.
5. If valid, the backend extracts the email, name, and avatar picture from the Google token.
6. **Just-In-Time (JIT) Provisioning:** If the user's email doesn't exist in the database, a new User and Organization are automatically created. The user is assigned the `CLIENT` role by default. Specific emails hardcoded in the admin list are given the `ADMIN` role.
7. A standard app JWT is returned and the flow continues identically to email/password login.

---

## 10. Email Ingestion Pipeline

**Service:** `email_service.py`
**Scheduler:** APScheduler `BackgroundScheduler` with 60-second interval
**Protocol:** IMAP4 over SSL to `imap.gmail.com`
**Credential:** Gmail App Password (not account password)

### Process

1. Every 60 seconds, APScheduler triggers `fetch_and_process_emails()`.
2. The function logs into Gmail via IMAP.
3. It searches the `INBOX` for UNSEEN (unread) emails.
4. For each unread email containing attachments, it:
   a. Verifies the sender's email is a known user in the database (security filter).
   b. For each valid attachment (PDF, JPG, PNG, XLSX, CSV), it reads the bytes.
   c. Creates a new `Invoice` database record attributed to the sender user.
   d. Triggers the same background processing pipeline (`_process_invoice_background`) as a direct upload.
   e. Sends a `RECEIVED` confirmation email back to the sender.
   f. Marks the email as read in Gmail.
5. On completion, sends a `APPROVED` or `REJECTED` email depending on the outcome of the AI pipeline.

### Email Templates

The email service (`send_status_email()`) sends HTML-formatted emails for:
- `RECEIVED` — Invoice received and queued for processing.
- `AUTO_APPROVED` — Invoice automatically approved.
- `UNDER_REVIEW` — Invoice routed for human review.
- `REJECTED` — Invoice rejected with reason.

---

## 11. Intelligence Engine

**Service:** `intelligence_service.py`

### Duplicate Detection

The system computes a SHA-256 hash of the raw OCR text for every invoice. Before finalizing processing, it queries the database for existing invoices in the same organization with the same `text_hash`, `vendor_name`, `invoice_number`, and `total_amount`. If a match is found, `duplicate_flag = True` is set. If the organization policy has `require_review_if_duplicate = True`, the invoice is moved to `UNDER_REVIEW`.

### Fraud Heuristics

`calculate_fraud_signals()` checks for:
- Low confidence score (below a configurable threshold)
- Very high invoice amounts
- Round-number totals (e.g., exactly $10,000.00 are statistically suspicious)
- Missing vendor information with high amounts

---

## 12. Deployment Architecture

### Current Setup (Local Development + Cloudflare Tunnel)

```
Developer Laptop
├── Terminal 1: uvicorn main:app --host 0.0.0.0 --port 8000
└── Terminal 2: cloudflared tunnel --url http://localhost:8000
                └── Generates public URL: https://random-words.trycloudflare.com

Vercel (Frontend)
└── NEXT_PUBLIC_API_URL = https://random-words.trycloudflare.com
```

**Limitation:** The Cloudflare Tunnel URL changes every time `cloudflared` is restarted. This means the `NEXT_PUBLIC_API_URL` environment variable on Vercel must be updated on every restart. This is the primary operational pain point of the current setup.

### Why Not Oracle Cloud?

Early in the project, we attempted to deploy the backend on Oracle Cloud's free tier (using Oracle Container Engine or a VM instance). This was blocked due to **service limit errors** (`vcn-count` exceeded on the free account). We abandoned Oracle Cloud entirely and pivoted to the local + Cloudflare Tunnel approach for rapid iteration.

### Considered Alternatives for Production

- **Render.com:** Free tier supports Docker deployments, would eliminate the tunnel. Considered but not implemented.
- **DigitalOcean App Platform:** ~$12/month, would provide a stable persistent URL.
- **AWS ECS / Fargate:** Too complex for current iteration speed needs.
- **Google Cloud Run:** Good LLM, good match but no free persistent compute.

---

## 13. Environment Configuration

All secrets are stored in `/backend/.env` (gitignored). The example template is at `.env.example`:

```env
# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Application JWT Secret
SECRET_KEY=your_super_secret_key

# Groq LLM API
GROQ_API_KEY=gsk_your_groq_api_key_here

# Cloudflare R2 Object Storage
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name

# Gmail IMAP (Email Ingestion)
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_from_google_security
EMAIL_IMAP_SERVER=imap.gmail.com

# CORS and Frontend URLs
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001","https://your-vercel-app.vercel.app"]

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_project.apps.googleusercontent.com
```

### Vercel Environment Variables

The Vercel frontend needs these variables set in the Vercel Dashboard:
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Cloudflare Tunnel URL (must be updated on restart) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

---

## 14. API Reference

All API routes are prefixed with `/api/v1`.

### Auth Routes (`/api/v1/auth`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Create new user + organization |
| `POST` | `/login` | Email/password login → returns JWT |
| `POST` | `/google` | Google OAuth login → verifies Google JWT → returns app JWT |
| `GET` | `/me` | Returns currently authenticated user's profile |

### Invoice Routes (`/api/v1/invoices`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload invoice file (multipart/form-data) → triggers background processing |
| `GET` | `/` | List all invoices for current user's organization |
| `GET` | `/{invoice_id}` | Get single invoice detail (used for status polling) |
| `GET` | `/{invoice_id}/download` | Get presigned R2 download URL for the original file |
| `POST` | `/{invoice_id}/reprocess` | Delete extracted data and re-run the AI pipeline |

### Admin Routes (`/api/v1/admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/invoices` | List all invoices across all organizations |
| `POST` | `/invoices/{id}/approve` | Manually approve an invoice |
| `POST` | `/invoices/{id}/reject` | Manually reject with rejection reason |
| `GET` | `/analytics` | Aggregate stats (total processed, average confidence, etc.) |
| `GET` | `/users` | List all users |
| `PUT` | `/users/{id}/toggle-active` | Enable/disable a user account |
| `GET` | `/policies/{org_id}` | Get policy settings for an organization |
| `PUT` | `/policies/{org_id}` | Update policy settings |

---

## 15. Errors Faced & Resolutions

This section documents every significant error encountered during the project's history, along with the exact root cause and how it was resolved.

---

### Error 1: Oracle Cloud Service Limit (Fatal — Abandoned Platform)
**Error:** `The following service limits were exceeded: vcn-count`
**Context:** Attempted to create a Virtual Cloud Network on Oracle Cloud Free Tier.
**Root Cause:** Oracle Free Tier imposes strict limits on Virtual Cloud Networks. The account had already hit the limit on the free region.
**Resolution:** Abandoned Oracle Cloud entirely. Switched to local development + Cloudflare Tunnel for external access.

---

### Error 2: Google Authentication Failing on Deployed Frontend
**Error:** Login with Google would silently fail or throw a CORS error.
**Root Cause (Multiple):**
1. The Cloudflare Tunnel URL had been restarted (old URL was no longer valid), but Vercel still had the old `NEXT_PUBLIC_API_URL` cached.
2. The Vercel build was cached and was serving stale JavaScript with the old API URL baked in.
3. The browser itself had cached the old service worker.
**Resolution:**
1. Restarted `cloudflared` tunnel and obtained new public URL.
2. Updated `NEXT_PUBLIC_API_URL` in Vercel Environment Variables.
3. Triggered a forced Vercel redeploy (clearing build cache).
4. Hard-refreshed the browser (`Ctrl+Shift+R`) to clear service worker cache.

---

### Error 3: Empty `__init__.py` Files Cluttering IDE
**Context:** VS Code's file explorer was showing many `__init__.py` files that were completely empty.
**Root Cause:** These are standard Python package marker files. They serve no functional purpose in modern Python 3 with implicit module namespacing.
**Resolution:** All empty `__init__.py` files were deleted from `api/`, `api/routes/`, `models/`, `schemas/`, `services/`.

---

### Error 4: `.pyc` / `__pycache__` Files Cluttering Repository
**Context:** Python's bytecode cache files were visible in the file explorer.
**Root Cause:** These are auto-generated compiled bytecode files Python creates for performance. They should never be committed.
**Resolution:** Ran `find . -name "__pycache__" -delete` and `find . -name "*.pyc" -delete`. The `.gitignore` was already set to ignore `__pycache__/` and `*.py[cod]`.

---

### Error 5: Multiple Uploaded Invoices Processing Simultaneously (Race Condition)
**Context:** When uploading 5 invoices at once, all 5 would trigger Groq API calls at the same time, causing rate limit errors and CPU spikes.
**Root Cause:** FastAPI's `BackgroundTasks` launches all tasks as concurrent threads by default. There was no serialization mechanism.
**Resolution:** Added a module-level `global_processing_lock = threading.Lock()`. Every background task acquires this lock before any AI work begins, forcing serial FIFO execution.

---

### Error 6: Invoices Hanging Indefinitely
**Context:** If an invoice contained a very complex or corrupted image, Tesseract would hang indefinitely, preventing any other invoice from being processed (due to the sequential lock).
**Root Cause:** No timeout mechanism existed on the processing pipeline.
**Resolution:** Wrapped `_run_extraction_pipeline()` in a `concurrent.futures.ThreadPoolExecutor` call with `future.result(timeout=180)`. If 3 minutes elapse, `TimeoutError` is caught, the invoice is marked `PROCESSING_FAILED`, and the lock is released.

---

### Error 7: AI Quantity Hallucination
**Context:** Invoices with line items would have wildly incorrect quantities (e.g., quantity of 59381 for a product).
**Root Cause:** OCR scrambled tables. Item numbers (like product codes `59381`) which appeared next to the quantity column were mistakenly extracted as the quantity value.
**Resolution:** Added point #3 to the LLM prompt: "The `qty` field is almost always a small number. If you see a massive integer, it is likely an Item ID. Use line math (`total / price = qty`) to deduce the true quantity."

---

### Error 8: AI Quantity Truncation (European Decimal Commas)
**Context:** After fixing hallucination, European invoices showed items with quantity `10` where the invoice showed `10,00` (European notation for `10.0`). More critically, `5,00` was being mangled.
**Root Cause:** OCR read `5,00` correctly. But the LLM saw `500` (dropped the comma). The hallucination policy rated `500` as suspicious. The LLM then used math (`line_total / unit_price`) which happened to give the right answer, or defaulted to `1`.
**Resolution:** Added point #2 to the LLM prompt: "European invoices use commas for decimals. `5,00` means `5.0`. ALWAYS convert comma-decimals to periods."

---

### Error 9: Vercel Build Failure — `Module not found: Can't resolve '@/lib/api-client'`
**Context:** Fresh GitHub push, Vercel attempted to build, failed because files were missing.
**Root Cause:** The root `.gitignore` file had `lib/` (intended for Python virtual environments). This glob matched **any** directory named `lib` anywhere in the project — including `frontend-next/src/lib/`. Git never tracked this folder.
**Resolution:** Changed `lib/` to `/lib/` in the root `.gitignore` (the leading `/` restricts the match to the repo root only). Then force-added and committed `frontend-next/src/lib/`.

---

### Error 10: Vercel Build Failure — TypeScript/ESLint Strict Errors
**Context:** Vercel's build environment runs `next build` with `--strict` equivalent behavior, treating all ESLint warnings as fatal errors.
**Root Cause:** Several minor TypeScript warnings (unused variables, `any` types) that don't affect runtime behavior were breaking the CI build.
**Resolution:** Added to `next.config.mjs`:
```javascript
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true }
```

---

## 16. Decisions & Trade-offs Log

| Decision | Why | Trade-off |
|---|---|---|
| Use Groq for LLM inference | Free tier, extremely fast (sub-10 second inference for 70B), no GPU required | Dependent on a third-party API; outages break extraction |
| Use Tesseract (local OCR) | Free, no API costs, offline capable | Accuracy lower than cloud OCR (Google Vision, AWS Textract) |
| Sequential processing with thread lock | Prevents race conditions and API rate limits | Only 1 invoice processed at a time; large batches take longer sequentially |
| 3-minute timeout per invoice | Prevents infinite hangs; releases queue for others | A very slow OCR job is killed even if it would have eventually succeeded |
| Neon PostgreSQL | Serverless, free tier, no DevOps needed | Slight cold-start latency; connection limits on free tier |
| Cloudflare R2 | Free egress, 10GB free storage | Less mature ecosystem than S3; presigned URL edge cases |
| Cloudflare Tunnel (local hosting) | Zero cost, instant setup | URL changes on restart; laptop must remain on |
| JWT stored in cookies | Works across tabs, compatible with Next.js middleware | Need to ensure HttpOnly is set for XSS protection in production |
| Temperature=0 for LLM | Fully deterministic extraction; same document always gives same result | Less creative; LLM cannot "try different approaches" for ambiguous documents |
| `json_object` response format | Guarantees LLM returns valid parseable JSON | Groq must be on a model that supports this parameter (Llama 3.3 70B does) |

---

## 17. Data Flow Walkthrough

### Scenario: Client uploads 3 PDF invoices simultaneously

**Step 1 — User Action:**
User drags 3 PDF files onto the upload page at `/client/upload`.

**Step 2 — Frontend (x3 parallel):**
For each file, the frontend immediately:
1. Calls `POST /api/v1/invoices/upload` with the file as `multipart/form-data`.
2. Receives `HTTP 201` with `{ "invoice_id": "abc-123", "status": "PROCESSING" }`.
3. Registers a polling job via `useInvoiceStatus` (polls every 3 seconds).

**Step 3 — Backend Route Handler (x3 simultaneous):**
Each request goes to `api/routes/invoice.py → POST /upload`:
1. Validates the JWT, identifies the user and organization.
2. Reads the file bytes into memory.
3. Creates an `Invoice` database record with `status = PROCESSING`.
4. Generates the R2 storage key: `{org_id}/{invoice_id}/{filename}`.
5. Registers `_process_invoice_background(...)` as a FastAPI `BackgroundTask`.
6. Returns `HTTP 201` to the frontend immediately.

**Step 4 — Background Workers (3 threads spawned, 1 processes at a time):**

**Invoice 1 begins immediately (acquires lock):**
- Uploads raw bytes to Cloudflare R2.
- Logs `PROCESSING_ACTIVE` event.
- A `ThreadPoolExecutor` submits `_run_extraction_pipeline()` with 180s timeout.
- Inside the pipeline:
  - `pdfplumber` tries digital text extraction.
  - If < 50 chars, renders pages as images at 200 DPI.
  - OpenCV processes: Grayscale → Adaptive Threshold.
  - Tesseract extracts text (`--oem 3 --psm 6`).
  - SHA-256 hash calculated and saved.
  - Groq API call: Llama 3.3 70B receives prompt + OCR text.
  - LLM returns structured JSON.
  - Failsafe: Python recalculates total from line items if null.
  - Confidence score calculated from extracted fields.
  - Duplicate check: query DB for same hash/invoice_number.
  - Fraud score calculated.
  - Policy Engine evaluates: confidence 0.97 > threshold 0.95 → `AUTO_APPROVED`.
  - Email sent to client: "Your invoice has been approved."
  - Processing time: 18.4 seconds recorded.
  - Lock released.

**Invoice 2 begins (waited for lock):**
- Identical pipeline runs...
- This one has `confidence = 0.82`, below threshold.
- Policy: `UNDER_REVIEW`.
- If `ai_auto_review_enabled` → secondary Groq call made.
- AI Auditor says `PASS` → overrides to `APPROVED`.
- Email sent.
- Lock released.

**Invoice 3 begins:**
- Very complex scanned image. OCR takes a long time.
- After exactly 180 seconds: `TimeoutError` caught.
- Invoice marked `PROCESSING_FAILED`.
- Event logged: "Extraction exceeded the 3-minute max time limit."
- Lock released.
- Admins can manually trigger Reprocess from the admin panel.

**Step 5 — Frontend Polling:**
While the above is happening, `useInvoiceStatus` polls `GET /invoices/{id}` every 3 seconds. As each invoice transitions from `PROCESSING` to its final state, the UI card updates automatically.

---

*This document was generated as a complete and authoritative reference for the InvoiceAI project. Last updated: March 2026.*
