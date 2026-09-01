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
    
    # Text cleaning: split lines, strip whitespace, remove empty lines
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    full_text = " ".join(lines)
    
    # 1. Voter Name (नाव)
    # Match "नाव :" or "नाव" followed by the content up to the next keyword
    name_match = re.search(r'नाव\s*[:;]?\s*(.*?)(?=\s*(?:वडिलांचे|पतीचे|आईचे|इतर|घर|वय))', full_text)
    if name_match:
        data["voterName"] = name_match.group(1).strip()
    
    # 2. Relative Name & Relation Type
    rel_match = re.search(r'(वडिलांचे|पतीचे|आईचे|इतर)?\s*नाव\s*[:;]?\s*(.*?)(?=\s*(?:घर|वय))', full_text)
    if rel_match:
        rel_type_str = rel_match.group(1)
        if rel_type_str == "वडिलांचे":
            data["relationType"] = "Father"
        elif rel_type_str == "पतीचे":
            data["relationType"] = "Husband"
        elif rel_type_str == "आईचे":
             data["relationType"] = "Mother"
        else:
             data["relationType"] = "Other"
             
        data["relativeName"] = rel_match.group(2).strip()

    # 3. House No (घर क्रमांक)
    house_match = re.search(r'घर\s*क्र(?:मांक)?\s*[:;]?\s*([a-zA-Z0-9\-/]+)(?=\s*वय)', full_text, flags=re.IGNORECASE)
    if house_match:
        data["houseNo"] = house_match.group(1).strip()
    else:
        # Sometimes 'घर क्र.' runs directly into the number with noise
        house_fallback = re.search(r'घर.*?[:;]?\s*([a-zA-Z0-9\-/]+)', full_text)
        if house_fallback:
             data["houseNo"] = house_fallback.group(1).strip()

    # 4. Age (वय)
    age_match = re.search(r'वय\s*[:;]?\s*(\d{2,3})', full_text)
    if age_match:
        try:
            data["age"] = int(age_match.group(1))
        except ValueError:
            data["needsReview"] = True
    else:
         data["needsReview"] = True

    # 5. Gender (लिंग)
    gender_match = re.search(r'लिंग\s*[:;]?\s*(पुरुष|महिला|तृतीयपंथी)', full_text)
    if gender_match:
        g = gender_match.group(1)
        if g == "पुरुष":
            data["gender"] = "Male"
        elif g == "महिला":
            data["gender"] = "Female"
        else:
            data["gender"] = "Other"
    else:
        # Fallback keyword match if 'लिंग' keyword is garbled
        if "पुरुष" in full_text:
             data["gender"] = "Male"
        elif "महिला" in full_text:
             data["gender"] = "Female"
        else:
             data["needsReview"] = True

    # Final review flags: check if essential text extraction completely failed
    if not data["voterName"] or not data["relativeName"]:
         data["needsReview"] = True

    return data
