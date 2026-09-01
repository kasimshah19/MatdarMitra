import fitz # PyMuPDF
import numpy as np
import cv2

def render_pdf_pages(pdf_path: str, dpi: int = 300) -> list[np.ndarray]:
    """
    Converts a PDF into a list of OpenCV images (numpy arrays).
    Renders using PyMuPDF (fitz) to avoid requiring Poppler on Windows.
    """
    cv_images = []
    
    # Open the PDF document
    doc = fitz.open(pdf_path)
    
    # Calculate scale factor for DPI (72 is default internal PDF DPI)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Render the page to a pixmap
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert raw pixmap RGB bytes to numpy array
        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, 3)
        
        # Convert RGB (PyMuPDF format) to BGR (OpenCV format)
        cv_img = cv_img = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        cv_images.append(cv_img)
        
    doc.close()
    return cv_images
