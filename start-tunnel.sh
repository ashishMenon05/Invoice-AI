#!/bin/bash
# InvoiceAI Local Server + Cloudflare Tunnel Starter
# Run this script to start the backend and expose it to the internet

BACKEND_DIR="$(dirname "$0")/backend"
PORT=8000

echo "======================================"
echo "  InvoiceAI - Starting Local Server"
echo "======================================"

# Start the FastAPI backend in the background
echo ""
echo "[1/2] Starting FastAPI backend on port $PORT..."
cd "$BACKEND_DIR"
/home/ashish/python/bin/uvicorn main:app --host 0.0.0.0 --port $PORT --reload &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 3

# Start Cloudflare Tunnel
echo ""
echo "[2/2] Starting Cloudflare Tunnel..."
echo "      *** COPY THE https://....trycloudflare.com URL BELOW ***"
echo "      *** Paste it into Vercel as NEXT_PUBLIC_API_URL + /api/v1 ***"
echo ""
cloudflared tunnel --url http://localhost:$PORT

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
echo "Server stopped."
