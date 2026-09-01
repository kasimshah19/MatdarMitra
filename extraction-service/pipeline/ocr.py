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
         
    return clean_epc, needs_review


def extract_box_text(image: np.ndarray, box: tuple) -> str:
    """
    Crops the main text body of the cell box and runs Marathi OCR.
    """
    x, y, w, h = box
    
    # The text is usually below the photo header block on the left
    # But usually just OCRing the whole box minus the photo slot works best.
    # The photo block is typically center-right. We'll crop slightly inside the borders.
    
    # Give a small 2-pixel pad to exclude the black border lines
    pad = 3
    text_crop = image[y+pad:y+h-pad, x+pad:x+w-pad]
    
    if len(text_crop.shape) == 3:
        text_crop = cv2.cvtColor(text_crop, cv2.COLOR_BGR2GRAY)
        
    # Simple binary threshold often works best for text, or Otsu
    _, text_thresh = cv2.threshold(text_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # PSM 6: Assume a single uniform block of text
    raw_text = pytesseract.image_to_string(text_thresh, lang='mar', config='--psm 6')
    return raw_text


def process_box(image: np.ndarray, box: tuple, sr_idx: int, page_no: int, part_no: str) -> Optional[VoterRecord]:
    """
    Coordinates the extraction for a single voter cell.
    sr_idx: The sequential index of this box (derived from reading order).
    """
    
    # 1. OCR the EPC number
    epc_val, epc_review = extract_epc(image, box)
    
    # 2. OCR the main Marathi text
    raw_text = extract_box_text(image, box)
    
    # 3. Parse the fields
    parsed_fields = parse_devanagari_fields(raw_text)
    
    # Combine review flags
    needs_review_overall = epc_review or parsed_fields["needsReview"]
    
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
        needsReview=needs_review_overall
    )
    
    return record
