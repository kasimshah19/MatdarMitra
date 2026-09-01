import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from models import ExtractionResponse, ExtractionSummary

from pipeline.render import render_pdf_pages
from pipeline.grid import detect_grid_boxes
from pipeline.ocr import process_box
from pipeline.header import extract_header_metadata

app = FastAPI(title="MatdarMitra Extraction API")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Setup CORS for local Vercel/Next.js dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract", response_model=ExtractionResponse)
async def extract_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_path = f"/tmp/{file.filename}"
    # Ensure /tmp exists (Windows fallback)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Pipeline: Render PDF to high-res images
        pages = render_pdf_pages(temp_path, dpi=300)
        if not pages:
             raise HTTPException(status_code=400, detail="PDF contains no renderable pages.")

        # 2. Extract metadata from Page 1
        metadata = extract_header_metadata(pages[0])
        
        all_voters = []
        needs_review_count = 0
        global_sr_idx = 1
        
        # 3. Process the first few pages ONLY to prevent massive timeouts
        # Pages usually start having voters at index 2 (Page 3)
        # We will parse up to page 4 to keep it extremely fast (15-20 seconds max)
        for i, page_img in enumerate(pages[:4]):
            boxes = detect_grid_boxes(page_img)
            
            for box in boxes:
               voter_data = process_box(page_img, box, sr_idx=global_sr_idx, page_no=i+1, part_no=metadata.partNumber)
               if voter_data:
                   all_voters.append(voter_data)
                   global_sr_idx += 1
                   if voter_data.needsReview:
                       needs_review_count += 1

        summary = ExtractionSummary(
            totalRecords=len(all_voters),
            needsReview=needs_review_count,
            totalPages=len(pages)
        )
        
        return ExtractionResponse(metadata=metadata, voters=all_voters, summary=summary)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
             os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
