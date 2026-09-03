import cv2
import numpy as np
from typing import List, Tuple

def detect_grid_boxes(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detects rectangular grid cells in the scanned image.
    Uses horizontal and vertical line detection to identify bounding boxes.
    Assumes a roughly 10x3 grid covering most of the page.
    Returns a list of (x, y, w, h) bounding boxes.
    """
    # Convert robustly to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # 1. Binarize
    # Use adaptive thresholding to handle lighting variations in scans
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10
    )

    # 2. Extract horizontal and vertical lines using morphological operations
    # Define kernels based on assumed image width/height (approx 300 DPI A4 is ~2400x3500)
    # The kernels need to be long enough to connect broken lines but not bridge text
    img_h, img_w = thresh.shape
    
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (int(img_w / 30), 1))
    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, int(img_h / 40)))
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    # 3. Combine lines to find intersections (the grid)
    table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
    # Re-binarize the combination
    _, table_mask = cv2.threshold(table_mask, 100, 255, cv2.THRESH_BINARY)

    # Note: We can also try simple morphological closing to connect faint lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    table_mask = cv2.morphologyEx(table_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # 4. Find contours (the individual grid cells)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    boxes = []
    # Filter contours based on expected area and aspect ratio of a voter box
    # A standard cell on A4 at 300 DPI is roughly 800-1000px wide, 250-350px tall
    # We use a broad range to account for crop/scan variations
    min_area = (img_w / 10) * (img_h / 30) # ~ 80k sq px
    max_area = (img_w / 2) * (img_h / 5)   # ~ 500k sq px

    raw_boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        aspect_ratio = w / float(h)
        
        # Expect wider than tall boxes (ratio typically 2.5 to 3.5)
        if min_area < area < max_area and 1.5 < aspect_ratio < 5.0:
            raw_boxes.append((x, y, w, h))

    # Deduplicate overlapping boxes (e.g. inner/outer border matches from RETR_TREE)
    def compute_iou(boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
        yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0:
            return 0
        boxAArea = boxA[2] * boxA[3]
        boxBArea = boxB[2] * boxB[3]
        return interArea / float(boxAArea + boxBArea - interArea)

    boxes = []
    # Sort raw_boxes by area descending so we prefer the slightly larger outer box
    raw_boxes.sort(key=lambda b: b[2]*b[3], reverse=True)
    for b in raw_boxes:
        # If it doesn't heavily overlap with an already accepted box, keep it
        is_duplicate = False
        for valid_b in boxes:
            if compute_iou(b, valid_b) > 0.6:
                is_duplicate = True
                break
        if not is_duplicate:
            boxes.append(b)

    # 5. Sort boxes (Reading order: Top to Bottom, then Left to Right within a row)
    # We cluster by Y-coordinate (rows) to handle slight slants
    if not boxes:
        return []

    # Sort primarily by Y
    boxes.sort(key=lambda b: b[1])
    
    # Group into rows based on vertical overlap
    rows = []
    current_row = [boxes[0]]
    # Typical box height relative to image
    y_tolerance = int(img_h / 100)  # ~35px

    for box in boxes[1:]:
        # If the box is roughly on the same Y-level as the current row
        if abs(box[1] - current_row[0][1]) < (current_row[0][3] / 2):
            current_row.append(box)
        else:
            # Sort the completed row by X-coordinate
            current_row.sort(key=lambda b: b[0])
            rows.append(current_row)
            current_row = [box]
            
    # Add the last row
    if current_row:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)

    # Flatten the row-sorted boxes list
    sorted_boxes = [box for row in rows for box in row]
    
    print(f"[MM:LAYOUT] Grid deduplicated: {len(raw_boxes)} raw contours -> {len(sorted_boxes)} distinct cells.")
    
    return sorted_boxes
