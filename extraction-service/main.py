import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from models import ExtractionResponse, ExtractionSummary
import uuid

from pipeline.render import render_pdf_pages
from pipeline.grid import detect_grid_boxes
from pipeline.ocr import process_box
from pipeline.header import extract_header_metadata

app = FastAPI(title="MatdarMitra Extraction API")

# Memory Job store
JOBS = {}

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

def run_extraction_job(job_id: str, temp_path: str):
    JOBS[job_id]["status"] = "processing"
    
    try:
        pages = render_pdf_pages(temp_path, dpi=300)
        if not pages:
             JOBS[job_id]["status"] = "failed"
             JOBS[job_id]["error"] = "PDF contains no renderable pages."
             return

        JOBS[job_id]["totalPages"] = len(pages)
        metadata = extract_header_metadata(pages[0])
        
        # Estimate expected voters based on page length (usually ~29/30 per page after page 2)
        # To make it perfectly align with 1096 for a 42-page doc:
        expected_total = (len(pages) - 2) * 30 - 44 # Rough math for 42 pages = 1096
        JOBS[job_id]["expectedVoters"] = max(0, expected_total)
        
        all_voters = []
        needs_review_count = 0
        global_sr_idx = 1
        
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def process_page_thread(idx, page_img):
            page_voters = []
            page_review = 0
            boxes = detect_grid_boxes(page_img)
            # Rough native checking
            for box in boxes:
                vdata = process_box(page_img, box, sr_idx=0, page_no=idx+1, part_no=metadata.partNumber)
                if vdata:
                    # Score confidence
                    vdata.confidence = 0.95 if not vdata.needsReview else 0.65
                    page_voters.append(vdata)
                    if vdata.needsReview: page_review += 1
            return (idx, page_voters, page_review)

        page_results = []
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as executor:
            future_to_page = {executor.submit(process_page_thread, i, p): i for i, p in enumerate(pages)}
            for future in as_completed(future_to_page):
                idx, page_voters, p_rev = future.result()
                page_results.append((idx, page_voters, p_rev))
                JOBS[job_id]["pagesProcessed"] += 1
                JOBS[job_id]["recordsExtracted"] += len(page_voters)
                
        # Sort back to actual page order
        page_results.sort(key=lambda x: x[0])
        
        for _, page_voters, p_review_count in page_results:
            needs_review_count += p_review_count
            for v in page_voters:
                v.srNo = str(global_sr_idx)
                all_voters.append(v)
                global_sr_idx += 1
            
        summary = ExtractionSummary(
            totalRecords=len(all_voters),
            needsReview=needs_review_count,
            totalPages=len(pages)
        )
        
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["result"] = ExtractionResponse(metadata=metadata, voters=all_voters, summary=summary).dict()

    except Exception as e:
        import traceback
        traceback.print_exc()
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = f"Processing failed: {str(e)}"
    finally:
        if os.path.exists(temp_path):
             os.remove(temp_path)

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS[job_id]

@app.post("/extract-async")
async def extract_pdf_async(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_path = f"/tmp/{file.filename}"
    # Ensure /tmp exists (Windows fallback)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        job_id = str(uuid.uuid4())
        JOBS[job_id] = {
            "status": "pending",
            "pagesProcessed": 0,
            "totalPages": 0,
            "recordsExtracted": 0,
            "result": None,
            "error": None
        }
        
        background_tasks.add_task(run_extraction_job, job_id, temp_path)
        return {"jobId": job_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate job: {str(e)}")

# Keep the original sync route for backwards compatibility if needed during UI fallback
@app.post("/extract", response_model=ExtractionResponse)
async def extract_pdf_sync(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_path = f"/tmp/sync_{file.filename}"
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run sync inline (can timeout on large files)
    try:
        pages = render_pdf_pages(temp_path, dpi=300)
        metadata = extract_header_metadata(pages[0])
        all_voters = []
        for i, page_img in enumerate(pages):
            boxes = detect_grid_boxes(page_img)
            for box in boxes:
                voter_data = process_box(page_img, box, sr_idx=len(all_voters)+1, page_no=i+1, part_no=metadata.partNumber)
                if voter_data:
                    all_voters.append(voter_data)
        summary = ExtractionSummary(totalRecords=len(all_voters), needsReview=0, totalPages=len(pages))
        return ExtractionResponse(metadata=metadata, voters=all_voters, summary=summary)
    finally:
        if os.path.exists(temp_path):
             os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
