# MatdarMitra Extraction Service

A Python FastAPI microservice for parsing scanned Indian electoral roll PDFs.
These PDFs contain full-page JPEG scans with no embedded text layer — all text
extraction is done via Tesseract OCR.

## System Dependencies

These must be installed at the OS level before running:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y poppler-utils tesseract-ocr

# Marathi trained data (often missing from default tesseract package)
sudo wget -O /usr/share/tesseract-ocr/5/tessdata/mar.traineddata \
  https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/mar.traineddata
```

**Windows (for local dev):**
- Install [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases)
  and add the `bin/` folder to your PATH.
- Install [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki)
  and select "Marathi" in the installer's language selection. Add to PATH.

## Python Setup

```bash
cd extraction-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running

```bash
uvicorn main:app --reload --port 8000
```

API will be available at `http://localhost:8000`.
Swagger docs at `http://localhost:8000/docs`.

## API

### POST /extract

Upload a PDF file and receive structured voter records.

```bash
curl -X POST http://localhost:8000/extract \
  -F "file=@voter_roll.pdf"
```

**Response:**
```json
{
  "metadata": {
    "assemblyConstituency": "152 - कराड उत्तर",
    "partNumber": "42",
    "pollingStation": "जि.प. प्राथमिक शाळा, कक्ष-१"
  },
  "voters": [
    {
      "srNo": "1",
      "epcNo": "YLT1234567",
      "voterName": "रमेश आनंदराव पाटील",
      "relativeName": "आनंदराव पाटील",
      "relationType": "Father",
      "houseNo": "12A",
      "age": 45,
      "gender": "Male",
      "partNo": "42",
      "pageNo": 1,
      "needsReview": false
    }
  ],
  "summary": {
    "totalRecords": 120,
    "needsReview": 3,
    "totalPages": 4
  }
}
```

## Testing

```bash
python test_extraction.py path/to/sample.pdf
```

## Architecture

```
main.py                 → FastAPI app, /extract endpoint
models.py               → Pydantic data models
pipeline/
  render.py             → render_pdf_pages()     — PDF → images at 300 DPI
  grid.py               → detect_grid_boxes()    — line detection → cell boxes
  ocr.py                → extract_box_text()     — OCR text region (Marathi)
                          extract_epc()          — OCR EPC number (English)
                          parse_devanagari_fields() — regex field parsing
  header.py             → extract_header_metadata() — page-1 header OCR
```
