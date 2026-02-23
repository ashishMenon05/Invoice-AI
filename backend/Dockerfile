# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for OpenCV, PyTesseract, and PostgreSQL
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirement list
COPY requirements.txt .

# Install python dependencies natively
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy source code safely
COPY . .

# Expose dynamic Render Port
# Default to 8000 if PORT is not provided by Render Environment
EXPOSE ${PORT:-8000}

# Run Uvicorn Fastapi safely bound to 0.0.0.0 mapping internally to Render port hooks
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
