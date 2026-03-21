from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from . import models, schemas, database, security, ai_service
from .database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MedWeave AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_doctor(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import jwt
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    doctor = db.query(models.Doctor).filter(models.Doctor.email == email).first()
    if doctor is None:
        raise credentials_exception
    return doctor

@app.post("/signup", response_model=schemas.Doctor)
def signup(doctor: schemas.DoctorCreate, db: Session = Depends(get_db)):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.email == doctor.email).first()
    if db_doctor:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = security.get_password_hash(doctor.password)
    db_doctor = models.Doctor(email=doctor.email, hashed_password=hashed_password, full_name=doctor.full_name)
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.email == form_data.username).first()
    if not doctor or not security.verify_password(form_data.password, doctor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": doctor.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/add_patient", response_model=schemas.Patient)
def add_patient(patient: schemas.PatientCreate, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    db_patient = models.Patient(
        doctor_id=current_doctor.id,
        encrypted_name=security.encrypt_data(patient.name),
        encrypted_history=security.encrypt_data(patient.history),
        encrypted_allergies=security.encrypt_data(patient.allergies),
        encrypted_medications=security.encrypt_data(patient.medications)
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    return schemas.Patient(
        id=db_patient.id,
        name=patient.name,
        history=patient.history,
        allergies=patient.allergies,
        medications=patient.medications
    )

@app.get("/get_patients", response_model=List[schemas.Patient])
def get_patients(current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    db_patients = db.query(models.Patient).filter(models.Patient.doctor_id == current_doctor.id).all()
    
    return [
        schemas.Patient(
            id=p.id,
            name=security.decrypt_data(p.encrypted_name),
            history=security.decrypt_data(p.encrypted_history),
            allergies=security.decrypt_data(p.encrypted_allergies),
            medications=security.decrypt_data(p.encrypted_medications)
        ) for p in db_patients
    ]

@app.post("/analyze_consultation", response_model=schemas.Consultation)
def analyze_consultation(consultation: schemas.ConsultationCreate, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    # 1. Fetch patient history (securely)
    patient = db.query(models.Patient).filter(models.Patient.id == consultation.patient_id, models.Patient.doctor_id == current_doctor.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    history_text = f"History: {security.decrypt_data(patient.encrypted_history)}\nAllergies: {security.decrypt_data(patient.encrypted_allergies)}\nMedications: {security.decrypt_data(patient.encrypted_medications)}"
    
    # 2. Run AI Analysis
    analysis = ai_service.analyze_consultation(consultation.transcript, history_text)
    
    # 3. Save consultation
    db_consultation = models.Consultation(
        patient_id=consultation.patient_id,
        doctor_id=current_doctor.id,
        transcript=consultation.transcript,
        ai_analysis=analysis
    )
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    
    return db_consultation

@app.get("/get_history/{patient_id}", response_model=List[schemas.Consultation])
def get_history(patient_id: int, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    return db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id, models.Consultation.doctor_id == current_doctor.id).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
