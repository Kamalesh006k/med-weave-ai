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

class PatientCreate(PatientBase):
    pass

class Patient(BaseModel):
    id: int
    name: str # Decrypted for output
    history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

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
