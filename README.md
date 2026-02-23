# InvoiceAI Cloud: Autonomous Multi-Tenant Financial Data Extraction Platform
## A Comprehensive Technical Whitepaper & Repository Guide

Welcome to the official repository for **InvoiceAI Cloud**. This document serves as both a monolithic `README.md` and an in-depth technical paper detailing the architecture, design patterns, algorithmic strategies, and exact technologies utilized in building this enterprise-grade SaaS platform.

If you are looking for a quick start guide, please see [`BRIEF_DOCUMENTATION.md`](./BRIEF_DOCUMENTATION.md) for concise installation instructions.

---

## 1. Abstract & Problem Statement

### 1.1 The Challenge of Unstructured Financial Data
In the modern B2B ecosystem, organizations receive thousands of invoices, receipts, and discrete financial documents daily. Historically, processing these documents requires tedious manual data entry, which is highly prone to human error, extremely slow, and non-scalable. 

Traditional Optical Character Recognition (OCR) systems attempt to solve this by matching regular expressions against extracted text strings. However, traditional OCR is brittle; if a vendor changes their invoice layout or if a receipt is crumpled, the coordinate-based or Regex-based extraction completely fails. 

### 1.2 The InvoiceAI Solution
**InvoiceAI Cloud** solves this by treating financial data extraction as a hybrid Computer Vision and Large Language Model (LLM) reasoning problem. By intelligently preprocessing images to preserve spatial topography (rows and columns) and feeding that hyper-structured text into a highly-capable LLM (`llama-3.3-70b-versatile`), the system can conceptually "understand" the document exactly like a human accountant would. 

The result is a platform capable of extracting structured JSON (including deeply nested line items) from completely unseen layouts with zero prior template training.

---

## 2. High-Level System Architecture

InvoiceAI operates on a fully decoupled microservices-inspired monolithic architecture, cleanly separating the user-facing interface, the data layer, and the asynchronous AI processing pipeline.

- **Frontend:** A highly interactive, server-side rendered Web App built in **Next.js 14**.
- **Backend API:** A highly concurrent REST API built in **FastAPI (Python)**.
- **Relational Data:** **PostgreSQL** handled via **SQLAlchemy ORM**.
- **Object Storage:** **Cloudflare R2** (S3 Protocol) for storing massive volumes of raw PDFs and Images securely.
- **Job Orchestration:** Background tasks and **APScheduler** handling the asynchronous OCR, LLM inference, and automated IMAP email polling.

---

## 3. Frontend Implementation Deep-Dive

The user interface of InvoiceAI is meticulously crafted to be purely functional, immediately responsive, and incredibly aesthetic.

### 3.1 Technology Stack (Client-Side)
- **Framework:** **Next.js 14** utilizing the modern App Router (`app/` directory) for optimized routing and layout nesting.
- **Language:** **TypeScript**. Enforces strict type safety across payloads bridging the backend API and frontend component props.
- **Styling:** **Tailwind CSS**. A utility-first CSS framework enabling pixel-perfect implementations of deep dark modes, glassmorphism, and responsive grids.
- **Components & Iconography:** **Lucide React** provides scalable SVGs, while custom stateless components handle complex interactions.
- **Data Visualization:** **Recharts**. Used extensively in the Admin Analytics route to render volumetric charts, pipelines, and historical performance tracking.

### 3.2 State Management & Contextization
- **Authentication Context:** `AuthContext.tsx` wraps the entire application. It intercepts login payloads, decodes Google SSR OAuth tokens via `@react-oauth/google`, and injects the `Bearer` token into an Axios/Fetch interceptor.
- **Polling Hooks:** Because invoice extraction takes time (OCR + LLM latency), the frontend utilizes a custom `useInvoiceStatus` React Hook. Rather than locking the user's screen in a `waiting` state, this hook performs exponential backoff polling, updating the UI badge from "Processing" to "Under Review" beautifully the exact moment the backend commits the extraction.

### 3.3 The Split-Screen Audit UI
A highly sophisticated screen layout exists at `/client/invoices/[id]`. It leverages the Web API `window.URL.createObjectURL()` to stream encrypted binary Blob data directly from the Python backend securely.
- **Left Pane:** Renders the original source receipt/PDF within an iframe or explicit image viewer.
- **Right Pane:** Renders the JSON output (Vendor, Taxes, Line Items) natively alongside editable inputs, allowing the human reviewer to instantly check the LLM's work side-by-side.

---

## 4. Backend Implementation Deep-Dive

The backend is engineered for raw speed, concurrency, and rock-solid reliability.

### 4.1 Technology Stack (Server-Side)
- **Framework:** **FastAPI**. Chosen specifically for its asynchronous underpinnings (`Starlette`), highly-automatic data validation (`Pydantic`), and implicit OpenAPI JSON spec generation.
- **Server:** **Uvicorn** utilized as the ASGI web server interface bridging HTTP connections to Python.
- **Security:** 
  - **Passlib & BCCrypt:** Salted and hashed passwords.
  - **PyJWT:** Algorithm `HS256` payload structuring for completely stateless token management.
  - **SlowAPI:** Limiter injected across all top-level public endpoints to rate-limit malicious actors and prevent API spam.

### 4.2 Database Modeling & Tenancy
Strict B2B multi-tenancy is enforced.
- **Models:** Built using `SQLAlchemy`. The core architecture pivots entirely around the `Organization` object. Every `User`, `Invoice`, and `OrganizationPolicy` enforces a Foreign Key cascade mapped to an `Organization`.
- **Query Routing:** The `require_client` or `require_admin` dependency implicitly injects the requester's `org_id` into all SQLAlchemy `.filter()` executions. It is physically impossible for Tenant A to query an invoice belonging to Tenant B.

### 4.3 Storage Abstraction Layer
`services/storage_service.py` handles binary streams. Using `boto3`, the system treats Cloudflare R2 as a standard AWS S3 bucket.
- Files are saved logically as: `organizations/{org_id}/invoices/{uuid}_{original_filename}`.
- This layer guarantees that disk I/O does not block the API thread.

---

## 5. The Advanced AI Pipeline Deep-Dive

This is the intellectual property and core competency of the codebase. The pipeline orchestrates Optical Character Recognition and Large Language Models simultaneously.

### 5.1 Document Ingestion & Classification
When a document hits the ingestion pipeline (either via Frontend Upload or Automated Email Inbox Syncing):
1. **Type Resolution:** The payload extension/MIME is verified.
2. **Digital Vector Fallback (`pdfplumber`):** If the file is a vector-based digital PDF (not a scan), `pdfplumber` rips the exact string data from the binary encoded fonts. This takes `<0.1s` and is perfectly accurate, completely bypassing the need for Computer Vision. 
3. **Structured Spreadsheets (`pandas`):** If the user uploads an `.xlsx` or `.csv`, `services/spreadsheet_service.py` completely bypasses the LLM, mapping columns natively to the Database.

### 5.2 Computer Vision Extraction (`pytesseract` & `OpenCV`)
If the document is an image or a scanned PDF:
1. **Grayscaling:** The image is explicitly reduced to 1-channel grayscale via `cv2.cvtColor`.
2. **Adaptive Thresholding:** `cv2.adaptiveThreshold` executes a sliding-window Gaussian calculation across the image matrix. This allows the system to read pitch-black text on a bright white background equally as well as text obscured by a shadow or crumple.
3. **Strict Spatial OCR (`--psm 6`):** Standard Tesseract (PSM 3) destroys tabular columns. InvoiceAI enforces **Page Segmentation Mode 6**. Tesseract is forced to assume the text is a single uniform block, aligning X/Y pixel bounds forcefully into rows. This guarantees that `Item | Qty | Price` does not get scrambled.

### 5.3 Massive Parameter LLM Extraction
The meticulously aligned raw text is passed to `services/llm_service.py`.
- **Engine:** **Groq** Cloud API.
- **Model:** **`llama-3.3-70b-versatile`**. A 70-billion parameter neural network.
- **Prompt Engineering Strategy:** We employ rigid prompt engineering instructing the AI to output *only* pure JSON. We enforce heuristics: *"Do not extract phone numbers as Quantities"* and *"Map quantities to the immediate left-aligned text"*.
- **Post-Calculation Failsafe:** Since LLMs struggle with math, if the AI fails to extract an explicit "Grand Total" from a receipt, the Python service intercepts the JSON, extracts the scalar floats attached to the `line_total` arrays, and deterministically executes a `sum()` calculation securely. This eliminates "$0 Total" hallucinations.

---

## 6. Autonomous Capabilities

### 6.1 Email Processing Cron Jobs
`services/email_service.py` handles invisible automation.
- Utilizes `APScheduler` configured with the FastAPI `lifespan` event.
- Connects directly to `imap.gmail.com`.
- Specifically searches `UNSEEN` emails, matches the Sender Domain to an `Organization`, downloads the attachments, and triggers the OCR pipeline seamlessly in the background. Replies immediately with an automated confirmation email using `smtplib`.

### 6.2 AI Autonomous Auditor
Admins can enable a Policy Engine property: `ai_auto_review_enabled`.
- Acts as a secondary robotic employee.
- It intercepts the completed extraction, verifies all line items multiply correctly (`unit_price * qty == line_total`), and checks for matching hashes the system automatically generates (`hashlib.sha256`) against the raw text to flag duplicate uploads.
- If flawless, it skips the human entirely and marks the invoice `APPROVED`. If suspicious, it marks it `ADMIN_PASS_NEEDED`.

---

## 7. Security & Compliance Standards

1. **In-Flight Encryption:** All data travels over HTTPS/WSS (Enforced in production via Render SSL issuance).
2. **At-Rest Encryption:** User passwords are BCCrypt hashed. Organization IDs are deeply obfuscated via UUIDv4 identifiers preventing enumeration attacks.
3. **API Integrity:** The Global Exception Handler (`main.py`) suppresses stack traces in production, returning standardized, vague JSON error footprints preventing attacker leakage.

---

## 8. Development & Deployment Procedures

### 8.1 Local Spinning
1. Install PostgreSQL and `tesseract-ocr`.
2. Copy `.env.example` manually routing to your R2/Groq/Postgres instances.
3. Backend: `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload`
4. Frontend: `cd frontend-next && npm i && npm run dev`

### 8.2 Production Deployment (Render)
The platform is governed by `render.yaml` (Infrastructure as Code).
- Utilizes a `Dockerfile` derived from `python:3.10-slim`.
- Injects native OS Ubuntu packages (`apt-get install -y tesseract-ocr tesseract-ocr-eng libpq-dev`) completely independent of Python, ensuring the C-bindings for OCR operate losslessly.
- Connected via a persistent, managed Neon Serverless Postgres DB.

---

### *Authored for comprehensive software engineering excellence.*
