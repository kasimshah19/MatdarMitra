import os
import sys
import json
import argparse
from pipeline.render import render_pdf_pages
from pipeline.grid import detect_grid_boxes
from pipeline.ocr import process_box
from pipeline.header import extract_header_metadata

def main():
    parser = argparse.ArgumentParser(description="Test MatdarMitra Extraction Pipeline")
    parser.add_argument("pdf_path", help="Path to the sample PDF file to extract")
    parser.add_argument("--pages", type=int, default=2, help="Number of pages to process for the test (default: 2 to save time)")
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf_path):
        print(f"Error: File not found: {args.pdf_path}")
        sys.exit(1)
        
    print(f"=== Rendering PDF (max {args.pages} pages) ===")
    # Notice: In a real test script, you might want to slice the PDF or test specific pages
    # pdf2image allows first_page and last_page kwargs, but we'll render all and slice the list
    pages = render_pdf_pages(args.pdf_path, dpi=300)
    
    pages_to_process = pages[:args.pages]
    
    print("\n=== Extracting Metadata (Page 1) ===")
    metadata = extract_header_metadata(pages[0])
    print(json.dumps(metadata.model_dump(), indent=2, ensure_ascii=False))
    
    print(f"\n=== Processing Pages ===")
    all_voters = []
    global_idx = 1
    
    for i, page_img in enumerate(pages_to_process):
        print(f"  Page {i+1}...")
        boxes = detect_grid_boxes(page_img)
        print(f"    Detected {len(boxes)} boxes.")
        
        for box in boxes:
            record = process_box(page_img, box, sr_idx=global_idx, page_no=i+1, part_no=metadata.partNumber)
            if record:
                all_voters.append(record)
                global_idx += 1
                
    # Summary
    needs_review = sum(1 for v in all_voters if v.needsReview)
    
    print("\n" + "="*50)
    print("=== EXTRACTION SUMMARY ===")
    print("="*50)
    print(f"Total Records Found: {len(all_voters)}")
    print(f"Records needing review: {needs_review}")
    
    print("\n=== SAMPLE RECORDS ===")
    # Print first 3 and first 3 that need review
    print("\n  -- Clean Samples --")
    clean = [v for v in all_voters if not v.needsReview][:3]
    for c in clean:
        print("  " + json.dumps(c.model_dump(), ensure_ascii=False))
        
    print("\n  -- Needs Review Samples --")
    review = [v for v in all_voters if v.needsReview][:3]
    if review:
        for r in review:
             print("  " + json.dumps(r.model_dump(), ensure_ascii=False))
    else:
        print("  None!")

if __name__ == "__main__":
    main()
