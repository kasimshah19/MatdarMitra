import os
import sys
import cv2
import numpy as np
import pytesseract
import fitz

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pipeline.grid import detect_grid_boxes
from pipeline.ocr import extract_epc, extract_box_text
from pipeline.parse import parse_devanagari_fields

def main():
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "2026-EROLLGEN-S13-8-SIR-DraftRoll-Revision1-MAR-75-WI.pdf")
    print("Using exact file:", pdf_path)
    if not os.path.exists(pdf_path):
        print(f'PDF missing at {pdf_path}')
        return
    doc = fitz.open(pdf_path)
    page = doc.load_page(2)
    pix = page.get_pixmap(dpi=300)
    nparr = np.frombuffer(pix.tobytes('png'), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    print('--- GRID DETECTION ---')
    boxes = detect_grid_boxes(img)
    print(f'Detected {len(boxes)} boxes on page 3.')
    if len(boxes) == 0: return
    box = boxes[0]
    x, y, w, h = box
    print(f'Box #1 Coordinates: x={x}, y={y}, w={w}, h={h}')
    cv2.imwrite('box1_crop.png', img[y:y+h, x:x+w])
    print('\n--- EPC REGION ---')
    epc_val, epc_review, epc_img, epc_raw = extract_epc(img, box)
    print('RAW_EPC_OCR:')
    print(repr(epc_raw))
    print('\n--- TEXT REGION ---')
    raw_text = extract_box_text(img, box, 1, 1)
    print('RAW_TEXT_OCR:')
    with open('raw_ocr_out.txt', 'w', encoding='utf-8') as f:
        f.write(raw_text)
    print('(Text saved to raw_ocr_out.txt to avoid cp1252 print crash)')
    print('\n--- PARSED RESULT ---')
    parsed = parse_devanagari_fields(raw_text)
    parsed['epcNo'] = epc_val
    with open('parsed_out.txt', 'w', encoding='utf-8') as f:
        for k, v in parsed.items(): f.write(f'{k}: {v}\n')
    print('(Parsed result saved to parsed_out.txt)')

if __name__ == '__main__':
    main()
