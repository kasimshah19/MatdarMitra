FROM python:3.9-slim

# Install system dependencies (Tesseract, language packs, and OpenCV dependencies)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-mar \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set environment variables for Tesseract and concurrency limits
ENV OMP_THREAD_LIMIT=1
ENV OCR_CONCURRENCY=1

# Expose the port Uvicorn uses
EXPOSE 8000

# Start the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
