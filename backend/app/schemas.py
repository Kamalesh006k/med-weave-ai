from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

class DoctorBase(BaseModel):
    email: EmailStr
    full_name: str

class DoctorCreate(DoctorBase):
    password: str

class Doctor(DoctorBase):
    id: int

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    patient_id: int
    message: str


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PatientBase(BaseModel):
    name: str # Plain text for input, will be encrypted
    history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    department: Optional[str] = "all"
    time_slot: Optional[str] = None
    status: Optional[str] = "Scheduled"
    severity: Optional[str] = "Normal"

class PatientCreate(PatientBase):
    pass

class RawIntake(BaseModel):
    note: str

class ParsedIntake(BaseModel):
    name: str = ""
    history: str = ""
    allergies: str = ""
    medications: str = ""
    department: str = "all"

class Patient(BaseModel):
    id: int
    name: str # Decrypted for output
    history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    department: Optional[str] = "all"
    time_slot: Optional[str] = None

    class Config:
        from_attributes = True

class ConsultationCreate(BaseModel):
    patient_id: int
    transcript: str

class Consultation(BaseModel):
    id: int
    patient_id: int
    transcript: str
    ai_analysis: Dict
    created_at: datetime

    class Config:
        from_attributes = True

class RealtimeCheckRequest(BaseModel):
    patient_id: int
    transcript: str

class RealtimeCheckResponse(BaseModel):
    warning: str
    diarized_text: str

class PrescriptionVerifyRequest(BaseModel):
    patient_id: int
    prescription: str
    session_summary: Optional[str] = ""

class PrescriptionVerifyResponse(BaseModel):
    status: str
    reason: str
    suggestions: Optional[str] = ""

# --- Operations Schemas ---

class MedicalCodingRequest(BaseModel):
    clinical_note: str

class MedicalCode(BaseModel):
    code: str
    description: str
    type: str # ICD-10 or CPT

class MedicalCodingResponse(BaseModel):
    codes: List[MedicalCode]
    reasoning: str

class ClaimAdjudicationRequest(BaseModel):
    patient_id: str
    diagnosis_codes: List[str]
    procedure_codes: List[str]
    authorization: str # Yes/No
    total_claimed_amount: float
    policy_reference: Optional[str] = "BlueCross v4.1"

class ClaimAdjudicationResponse(BaseModel):
    status: str # Approved / Partially Approved / Rejected / Pending Authorization
    allowed_amount: float
    insurance_payable: float
    patient_responsibility: float
    remarks: str

class PriorAuthRequest(BaseModel):
    patient_id: int
    requested_service: str
    clinical_justification: str

class PriorAuthResponse(BaseModel):
    auth_number: Optional[str] = None
    status: str # AUTHORIZED, DENIED, MORE_INFO_REQUIRED
    reasoning: str
    criteria_met: List[str]
    criteria_failed: List[str]
