from typing import Optional, List
from pydantic import BaseModel

class VoterRecord(BaseModel):
    srNo: str
    epcNo: str
    voterName: str
    relativeName: str
    relationType: str
    houseNo: str
    age: int
    gender: str
    partNo: str
    pageNo: int
    cardIndex: int = 0
    confidence: float = 1.0
    needsReview: bool

class ConstituencyMetadata(BaseModel):
    assemblyConstituency: str
    partNumber: str
    pollingStation: str

class ExtractionSummary(BaseModel):
    totalRecords: int
    needsReview: int
    totalPages: int

class ExtractionResponse(BaseModel):
    metadata: ConstituencyMetadata
    voters: List[VoterRecord]
    summary: ExtractionSummary
