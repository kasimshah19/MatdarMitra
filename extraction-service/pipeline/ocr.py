import cv2
import numpy as np
import pytesseract
import re
from typing import Optional
import sys
import os

# Specifying the exact path where Windows setup installs Tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Add parent to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import VoterRecord
from pipeline.parse import parse_devanagari_fields

def extract_epc(image: np.ndarray, box: tuple) -> tuple[str, bool]:
    """
    Crops the top-right corner of the cell box for the EPC number and OCRs it.
    Returns (cleaned_epc, needs_review).
    """
    x, y, w, h = box
    
    # Typically EPC is in the top right.
    # Adjust crop based on typical layout inside the bounding box.
    crop_w = int(w * 0.4)  # right 40%
    crop_h = int(h * 0.25) # top 25%
    epc_crop = image[y:y+crop_h, x+(w-crop_w):x+w]

    # Pre-process for English alphanumeric OCR
    # Convert to gray
    if len(epc_crop.shape) == 3:
        epc_crop = cv2.cvtColor(epc_crop, cv2.COLOR_BGR2GRAY)
        
    # Scale up slightly to help Tesseract with the font
    epc_crop = cv2.resize(epc_crop, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # OTSU Binarization
    _, epc_thresh = cv2.threshold(epc_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Required Tesseract config for this font: --psm 8 (single word) --oem 1
    raw_epc = pytesseract.image_to_string(epc_thresh, lang='eng', config='--psm 8 --oem 1')
    
    # Clean up and validate
    clean_epc = re.sub(r'[^A-Z0-9]', '', raw_epc.upper())
    
    needs_review = False
    # Validate against expected pattern (e.g., YLT1234567)
    if not re.match(r'^[A-Z]{2,4}[0-9]{6,8}$', clean_epc):
         needs_review = True
         
    return clean_epc, needs_review, epc_thresh, raw_epc


def extract_box_text(image: np.ndarray, box: tuple, page_no: int, sr_idx: int) -> str:
    """
    Crops the main text body of the cell box and runs Marathi OCR.
    """
    x, y, w, h = box
    
    # Crop out the photo area (usually left side/bottom left)
    # We take the middle-right area which holds the textual details
    crop_x = int(w * 0.1) # Skips the very left edge mostly
    crop_y = int(h * 0.20) # Skip the top EPC line
    text_crop = image[y+crop_y:y+h, x+crop_x:x+w]
    
    if len(text_crop.shape) == 3:
        text_crop = cv2.cvtColor(text_crop, cv2.COLOR_BGR2GRAY)
        
    # Simple binary threshold often works best for text, or Otsu
    _, text_thresh = cv2.threshold(text_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Save debug crop for first box
    if page_no == 3 and sr_idx == 1:
        cv2.imwrite(f"debug_page1_box1_text.png", text_thresh)
        
    # PSM 6: Assume a single uniform block of text
    # It is crucial to have the Marathi language pack installed (mar)
    raw_text = pytesseract.image_to_string(text_thresh, lang='mar', config='--psm 6')
    
    if page_no == 3 and sr_idx == 1:
        with open("debug_page1_box1_raw_ocr.txt", "w", encoding="utf-8") as f:
            f.write(raw_text)
            
    return raw_text


def process_box(image: np.ndarray, box: tuple, sr_idx: int, page_no: int, part_no: str) -> Optional[VoterRecord]:
    """
    Coordinates the extraction for a single voter cell.
    """
    # 1. OCR the EPC number
    epc_val, epc_review, epc_img, epc_raw = extract_epc(image, box)
    
    # 2. OCR the main Marathi text
    raw_text = extract_box_text(image, box, page_no, sr_idx)
    
    if page_no == 3 and sr_idx == 1:
        cv2.imwrite(f"debug_page1_box1_epc.png", epc_img)
        with open("debug_page1_box1_raw_ocr_epc.txt", "w", encoding="utf-8") as f:
            f.write(epc_raw)
            
    # 3. Parse the fields
    parsed_fields = parse_devanagari_fields(raw_text)
    
    # Calculate genuine completeness confidence (5 fields tested)
    valid_fields = 0
    if not epc_review: valid_fields += 1
    if parsed_fields["voterName"] != "Unknown": valid_fields += 1
    if parsed_fields["relativeName"] != "Unknown": valid_fields += 1
    if parsed_fields["age"] != 0 and parsed_fields["age"] != None: valid_fields += 1
    if parsed_fields["gender"] != "Other": valid_fields += 1
    
    computed_confidence = round(valid_fields / 5.0, 2)
    
    # Combine review flags (If we missed crucial fields or EPC failed formatting)
    needs_review_overall = (computed_confidence < 0.6) or epc_review or parsed_fields["needsReview"]
    
    # Construct record
    record = VoterRecord(
        srNo=str(sr_idx), # Deterministic from reading order
        epcNo=epc_val,
        voterName=parsed_fields["voterName"],
        relativeName=parsed_fields["relativeName"],
        relationType=parsed_fields["relationType"],
        houseNo=parsed_fields["houseNo"],
        age=parsed_fields["age"],
        gender=parsed_fields["gender"],
        partNo=part_no,
        pageNo=page_no,
        confidence=computed_confidence,
        needsReview=needs_review_overall
    )
    
    return record
