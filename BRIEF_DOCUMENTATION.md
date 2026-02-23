# InvoiceAI Cloud: Quick Start Guide

This is the brief documentation designed to get you up and running with the InvoiceAI platform in minutes.

For the massive, comprehensive technical paper detailing all algorithms, OCR logic, and architectural scaling decisions, please refer to the massive [README.md](./README.md) file.

---

## ⚡ Prerequisites
1. **Node.js** (v18+)
2. **Python** (3.10+)
3. **PostgreSQL** (Local OR Neon.tech)
4. **Tesseract OCR** (Must be installed on your OS!)

## 🚀 Setup the Backend (FastAPI / Python)

1. **Navigate to the directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy the `.env.example` file and create a `.env` file. Fill in your Postgres connection string, your Groq API key, and your Cloudflare R2 / AWS S3 buckets.

5. **Run the Server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend will now be running at `http://localhost:8000/docs`*

---

## 💻 Setup the Frontend (Next.js / React)

1. **Navigate to the directory:**
   ```bash
   cd frontend-next
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Ensure you have configured Google OAuth keys if you plan to use SSO, otherwise the default UI will utilize traditional JWT Email/Password authentication routed to `localhost:8000`.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   *The client interface will now be running at `http://localhost:3000`*

## 🧑‍💻 Usage

- Register a new account at `http://localhost:3000/register`.
- If you are an **Admin**, navigate to `http://localhost:3000/admin/dashboard` to view analytics, setup custom policies, and review the queue.
- If you are a **Client**, navigate to `http://localhost:3000/client/dashboard` to upload messy invoices, receipts, and spreadsheets and watch the AI instantly structure them!
