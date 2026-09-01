import cv2
import numpy as np
import pytesseract
import re
import sys
import os

# Specifying the exact path where Windows setup installs Tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ConstituencyMetadata

def extract_header_metadata(image: np.ndarray) -> ConstituencyMetadata:
    """
    OCRs the top header portion of the first page to extract metadata.
    """
    h, w = image.shape[:2]
    # The header is typically in the top 20% of the first page
    header_crop = image[0:int(h * 0.2), 0:w]
    
    if len(header_crop.shape) == 3:
        header_crop = cv2.cvtColor(header_crop, cv2.COLOR_BGR2GRAY)
        
    _, header_thresh = cv2.threshold(header_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Needs to handle both English and Marathi as headers are often bilingual
    raw_text = pytesseract.image_to_string(header_thresh, lang='mar+eng')
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    full_text = " ".join(lines)
    
    assembly = ""
    part_number = ""
    polling_stn = ""
    
    # Regex parsing for header fields (flexible to allow for OCR noise)
    
    # Assembly Constituency (e.g., "मंतदारसंघाचे नाव : 152 - कराड उत्तर")
    assembly_match = re.search(r'(?:मतदारसंघाचे\s*नाव|Assembly).*?[:;]\s*([0-9]+\s*-\s*[^\d]+?)(?=\s*(?:भाग|यादी|Part))', full_text, flags=re.IGNORECASE)
    if assembly_match:
        assembly = assembly_match.group(1).strip()
        
    # Part Number (e.g., "भाग क्रमांक : 42")
    part_match = re.search(r'(?:भाग\s*क्रमांक|Part\s*No).*?[:;]\s*([0-9]+)', full_text, flags=re.IGNORECASE)
    if part_match:
        part_number = part_match.group(1).strip()
        
    # Polling Station (e.g., "मतदान केंद्राचे नाव व ठिकाण : जि.प. प्राथमिक शाळा")
    polling_match = re.search(r'(?:मतदान\s*केंद्राचे|Polling\s*Station).*?[:;]\s*(.*?)(?=\s*(?:मतदान|वय|नाव|मुख्य|Pincode))', full_text, flags=re.IGNORECASE)
    if polling_match:
         polling_stn = polling_match.group(1).strip()
         # Limit length in case regex overran
         if len(polling_stn) > 100:
             polling_stn = polling_stn[:100] + "..."

    return ConstituencyMetadata(
        assemblyConstituency=assembly or "Unknown",
        partNumber=part_number or "Unknown",
        pollingStation=polling_stn or "Unknown"
    )
