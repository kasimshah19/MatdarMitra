import re
from typing import Optional, Dict, Any

def parse_devanagari_fields(raw_text: str) -> Dict[str, Any]:
    """
    Parses the raw OCR text (Marathi) into structured fields.
    Handles the standard layout:
        नाव : [Voter Name]
        वडिलांचे नाव / पतीचे नाव / इ. : [Relative Name]
        घर क्रमांक : [House No]
        वय : [Age] लिंग : [Gender]
    """
    # Initialize defaults
    data = {
        "voterName": "",
        "relativeName": "",
        "relationType": "Other",
        "houseNo": "",
        "age": 0,
        "gender": "",
        "needsReview": False
    }
    
    # 1. Text cleaning: split lines, strip whitespace, remove empty lines
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    
    if len(lines) >= 1:
        # Line 1: Voter Name
        m = re.match(r'^नाव\s*[:;]?\s*(.+)$', lines[0])
        if m:
            data["voterName"] = m.group(1).strip()
            
    if len(lines) >= 2:
        # Line 2: Relative Name & Relation Type
        line2 = lines[1]
        if "वडिलांचे" in line2:
            data["relationType"] = "Father"
        elif "पतीचे" in line2:
            data["relationType"] = "Husband"
        elif "पत्नीचे" in line2:
            data["relationType"] = "Wife"
        elif "आईचे" in line2:
             data["relationType"] = "Mother"
        else:
             data["relationType"] = "Other"
             
        parts = re.split(r'[:;ः]', line2, maxsplit=1)
        if len(parts) > 1:
            data["relativeName"] = parts[1].strip()
        elif "नाव" in line2:
            # fallback if colon is missing
            data["relativeName"] = line2.split("नाव", 1)[1].strip()
            
    if len(lines) >= 3:
        # Line 3: House No
        m = re.match(r'^घर\s*क्र(?:मांक)?\s*[:;]?\s*(.*)$', lines[2])
        if m:
            data["houseNo"] = m.group(1).strip()
            
    if len(lines) >= 4:
        # Line 4: Age & Gender
        line4 = lines[3]
        if 'लिंग' in line4:
            parts = line4.split('लिंग', 1)
            age_m = re.search(r'\d+', parts[0])
            if age_m:
                data["age"] = int(age_m.group(0))
            if 'महिला' in parts[1]:
                data["gender"] = "Female"
            elif 'पुरुष' in parts[1]:
                data["gender"] = "Male"
            else:
                data["gender"] = "Other"
        else:
            age_m = re.search(r'\d+', line4)
            if age_m:
                 data["age"] = int(age_m.group(0))
            if 'महिला' in line4:
                 data["gender"] = "Female"
            elif 'पुरुष' in line4:
                 data["gender"] = "Male"

    # Final review flags: check if essential text extraction completely failed
    if not data["voterName"] or not data["relativeName"]:
         data["needsReview"] = True
    if data["age"] == 0:
         data["needsReview"] = True

    return data
