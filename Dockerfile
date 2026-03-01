FROM python:3.11-slim

# Install Tesseract for OCR and system libraries
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to backend
WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ONLY the backend code into /app
COPY backend/ .

# Expose Render standard port
EXPOSE 10000

# Start Uvicorn - main.py is now directly in /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
