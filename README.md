# InvoiceAI Cloud: Autonomous Multi-Tenant Invoice Processing Platform

Welcome to **InvoiceAI Cloud**, an enterprise-grade, multi-tenant B2B SaaS platform designed to completely automate the invoice and receipt extraction workflow. By leveraging state-of-the-art Optical Character Recognition (OCR), highly tuned Large Language Models (LLMs), and an autonomous decision-making engine, InvoiceAI reduces manual data entry to zero, detects fraud, and seamlessly integrates with client workflows.

---

## 🚀 Project Overview

The core mission of InvoiceAI is to process unstructured, messy financial documents (invoices, receipts, spreadsheets) and convert them into structured, actionable JSON data. 

**The Challenge:** Traditional OCR solutions fail on complex layouts, hallucinate numbers, and require rigid templates. 
**The Solution:** InvoiceAI combines computer vision (OpenCV + Tesseract) to preserve structural alignment with high-capacity LLMs (Groq / Llama 3.3 70B) to intelligently parse, validate, and normalize the data, all while providing a beautiful, real-time tracking interface for both end-clients and administrators.

---

## 🛠️ Comprehensive Technology Stack

The project is built using a modern, scalable, and decoupled architecture.

### 🌐 Frontend Architecture
- **Framework:** **Next.js 14 (App Router)** & **React**. Provides SSR/SSG capabilities for high performance and SEO.
- **Styling:** **Tailwind CSS**. Utility-first styling for rapid, responsive UI development.
- **Icons & UI Components:** **Lucide React** for crisp SVGs and custom highly-interactive components (like the Split-Screen Review UI).
- **Authentication:** Custom JWT-based context combined with **@react-oauth/google** for seamless Google SSO.
- **Data Visualization:** **Recharts**. Used to build the Executive Analytics Dashboard, rendering 7-day volumetric charting and pipeline metrics. 
- **API Client:** Custom Axios-based or Fetch-based singleton with automatic token injection and error handling. Provides mechanisms for polling (`useInvoiceStatus`) and Blob streaming (`getFileBlob`) for secure document viewing.

### ⚙️ Backend Architecture
- **Framework:** **FastAPI (Python)**. High-performance, async-first backend for rapid API development and auto-generated Swagger documentation.
- **Database ORM:** **SQLAlchemy**. Maps Python objects to PostgreSQL tables.
- **Database:** **PostgreSQL (Neon Tech)**. Cloud-native, scalable relational database handling multi-tenant data securely.
- **Authentication & Security:** 
  - **Passlib & bcrypt** for password hashing.
  - **PyJWT** for secure, stateless access tokens.
  - **SlowAPI** for endpoint rate-limiting to prevent DDoS/Brute-force attacks.
- **Background Processing:** **FastAPI BackgroundTasks** & **APScheduler**. Handles heavy OCR/LLM workloads and scheduled cron jobs (like polling email inboxes) without blocking the main event loop.

### 🧠 AI & Data Extraction Pipeline
- **Computer Vision & Pre-processing:** 
  - **OpenCV (`cv2`)** & **NumPy**: Advanced image preprocessing (Grayscale conversion, Adaptive Gaussian Thresholding) to pull dark text from light backgrounds seamlessly.
- **Optical Character Recognition (OCR):**
  - **Tesseract OCR (`pytesseract`)**: Tuned specifically with Page Segmentation Mode 6 (`--psm 6`) to read documents as a single uniform block, strictly preserving tabular row alignments to prevent column-major parsing errors.
  - **pdfplumber**: Used for perfect, deterministic text extraction from digitally generated PDFs before falling back to OCR.
- **Large Language Models (LLMs):**
  - **Groq API**: Lightning-fast inference engine.
  - **Model:** `llama-3.3-70b-versatile`. A massive 70-billion parameter model utilized to map disjointed text strings into highly structured JSON schemas (Vendor, Taxes, Line Items).
- **Data Parsing:** **Pandas**. Used in the `spreadsheet_service.py` to effortlessly chew through bulk CSV and Excel uploads, bypassing the LLM entirely for explicitly structured tabular data.

### ☁️ Infrastructure & Integrations
- **Storage:** **Cloudflare R2** (via **Boto3**). S3-compatible, zero-egress-fee object storage for archiving uploaded documents and emails.
- **Email Ingestion:** Standard Python `imaplib` and `email` modules used via `APScheduler` to actively poll IMAP servers (like Gmail) for incoming invoices, automatically parsing attachments.
- **Deployment:** **Docker** and **Render.yml**. Infrastructure as Code for seamless deployment, packaging Ubuntu dependencies like `libpq-dev` and `tesseract-ocr` natively.

---

## ✨ Highly Detailed Feature Breakdown

### 1. Multi-Tenant Role-Based Access Control (RBAC)
- **Organizations & Users:** Every user belongs to an `Organization`. Data is strictly siloed.
- **Roles:** `Admin` (System-wide reviewers/managers) vs `Client` (End-users submitting documents).
- **Google Auto-Provisioning:** Users signing in via Google are automatically verified; if their organization doesn't exist, the system implicitly provisions one, ensuring entirely frictionless onboarding.

### 2. The Extraction Intelligence Engine (OCR + LLM)
This is the core of InvoiceAI. The pipeline operates as follows:
1. **Intelligent Routing:** PDF? Run `pdfplumber`. Image? Run OpenCV + Tesseract. Spreadsheet? Run Pandas.
2. **Spatial Preservation:** By enforcing `--psm 6` in Tesseract, tabular invoices (Item | Qty | Price | Total) do not get scrambled into vertical columns, ensuring the LLM receives logically sequenced text.
3. **Prompt Engineering:** The LLM prompt is heavily constrained:
   - "Do not extract phone numbers as quantities."
   - "Penalize confusing SKU IDs with quantities."
   - "Ignore Malaysian tax codes like 'SR'."
4. **Mathematical Failsafes:** If the LLM successfully parses line items but fails to find a "Grand Total" printout at the bottom of the receipt, the backend deterministic Python engine mathematically sums the `line_total` amounts to generate the `grand_total`, preventing `$0` hallucinations.

### 3. Duplicate & Fraud Detection
- **Cryptographic Hashing:** Uses `SHA256` on the raw OCR text to generate a unique document fingerprint. Instantly flags identically uploaded files as duplicates.
- **Heuristic Fraud Scoring:** Evaluates the structure computationally: High confidence scores coupled with excessively large or perfectly rounded numbers trigger a `fraud_flag` requiring mandatory Admin review.

### 4. Configurable Policy Engine & Auto-Pilot Mode
- **Organization Policies:** Admins can define custom confidence thresholds (e.g., 90%) for Auto-Approval on a per-organization basis.
- **AI Auto-Review Agent:** For documents falling below the confidence threshold, organizations can enable a secondary AI Auditor. This agent scrutinizes the extracted JSON, looking for anomalies. If it finds none, it can autonomously elevate the status to `APPROVED`. If it is uncertain, it marks it `ADMIN_PASS_NEEDED`.
- **Ghost UI Loop:** In the Admin Dashboard, toggling "Auto-Pilot" puts the UI into a hands-free state. It sequentially loads pending invoices, triggers the Auto-Review agent, displays the decision for 2 seconds, and automatically navigates to the next document.

### 5. Email Ingestion Pipeline
- **Automated Workflow:** Clients simply email their invoices to a designated inbox.
- **Cron Polling:** Every 60 seconds, `APScheduler` checks the IMAP server.
- **Processing:** Validates the sender, downloads PDF/Image attachments, stores them in Cloudflare R2, and queues background extraction.
- **Receipt Confirmation:** The system autonomously replies to the sender: *"Your invoice has been received and is being processed by our AI pipeline..."*

### 6. Interactive Dashboards & Split-Screen Review
- **Client View:** Real-time polling of document status. Beautiful dropzones for batch uploads.
- **Admin Analytics:** Recharts integration showing volumetric processing speeds, average extraction margins, and pending queue size.
- **Split-Screen UI:** When reviewing an invoice, the Admin sees the original PDF/Image rendered on the left, and the extracted data fields (fully editable) on the right. 

### 7. Batch Operations & Error Recovery
- **Batch Re-extraction:** If a system update occurs or an OCR engine faults, Admins can hit "Reprocess Failed Invoices". This hits a high-performance backend endpoint that loops over failed documents (`PROCESSING_FAILED`), resets their state, and queues a massive background re-extraction job, ensuring instantaneous UI feedback with zero CORS timeouts.

---

## 💻 Getting Started (Local Development)

### Pre-requisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **PostgreSQL** (Running locally or via cloud like Neon)
- **Tesseract OCR** (`sudo apt-get install tesseract-ocr tesseract-ocr-eng`)

### Environment Setup (`.env` file)
Create a `.env` file in the `backend/` directory with the following massive configuration map:

```env
# Server
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/invoiceaidb

# Security
JWT_SECRET_KEY=your_super_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM 
GROQ_API_KEY=gsk_your_groq_api_key

# Storage (Cloudflare R2 / AWS S3)
R2_ACCESS_KEY=your_r2_access
R2_SECRET_KEY=your_r2_secret
R2_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=invoice-ai-bucket

# Email Ingestion
EMAIL_ADDRESS=your_inbox@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_IMAP_SERVER=imap.gmail.com
EMAIL_SMTP_SERVER=smtp.gmail.com

# System
TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata/
TESSERACT_CMD=/usr/bin/tesseract
```

### Running the Application

1. **Start the Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

2. **Start the Frontend:**
```bash
cd frontend-next
npm install
npm run dev
```

Visit `http://localhost:3000` and `http://localhost:8000/docs` to begin exploring!

---
*Built with precision and passion. Completely reimagining the future of financial data extraction.*
