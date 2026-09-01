#!/usr/bin/env bash
# setup.sh — Install system-level dependencies for the extraction service.
# Run with: sudo bash setup.sh

set -euo pipefail

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y poppler-utils tesseract-ocr

echo "=== Downloading Marathi Tesseract trained data ==="
TESSDATA_DIR="/usr/share/tesseract-ocr/5/tessdata"
if [ ! -d "$TESSDATA_DIR" ]; then
  # Fallback for older tesseract versions
  TESSDATA_DIR="/usr/share/tesseract-ocr/4.00/tessdata"
fi

wget -O "${TESSDATA_DIR}/mar.traineddata" \
  https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/mar.traineddata

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Setup complete ==="
echo "Run:  uvicorn main:app --reload --port 8000"
