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
        encrypted_medications=security.encrypt_data(patient.medications),
        department=patient.department,
        time_slot=patient.time_slot,
        status=patient.status,
        severity=patient.severity
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

@app.post("/parse_intake", response_model=schemas.ParsedIntake)
def parse_intake(intake: schemas.RawIntake, current_doctor: models.Doctor = Depends(get_current_doctor)):
    parsed = ai_service.parse_clinical_note(intake.note)
    # Ensure all required keys exist and provide fallbacks if missing
    return schemas.ParsedIntake(
        name=parsed.get("name", "Unknown Patient"),
        history=parsed.get("history", "No history extracted."),
        allergies=parsed.get("allergies", "None reported."),
        medications=parsed.get("medications", "None reported."),
        department=parsed.get("department", "all")
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
            medications=security.decrypt_data(p.encrypted_medications),
            department=p.department,
            time_slot=p.time_slot,
            status=p.status,
            severity=p.severity
        ) for p in db_patients
    ]

@app.delete("/delete_patient/{patient_id}")
def delete_patient(patient_id: int, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id, models.Patient.doctor_id == current_doctor.id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db.delete(db_patient)
    db.commit()
    return {"message": "Patient deleted successfully"}

@app.get("/daily_briefing")
def get_daily_briefing(current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    db_patients = db.query(models.Patient).filter(models.Patient.doctor_id == current_doctor.id).all()
    if not db_patients:
        return {"briefing": "No patients currently in the directory."}
    
    # Create a simplified list for the AI
    minimal_info = ""
    for p in db_patients:
        name = security.decrypt_data(p.encrypted_name)
        meds = security.decrypt_data(p.encrypted_medications)
        history = security.decrypt_data(p.encrypted_history)
        minimal_info += f"- {name}: {history[:100]} | Meds: {meds}\n"
        
    briefing = ai_service.generate_briefing(minimal_info)
    return {"briefing": briefing}


@app.post("/analyze_consultation", response_model=schemas.Consultation)
def analyze_consultation(consultation: schemas.ConsultationCreate, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    # 1. Fetch patient history (securely)
    patient = db.query(models.Patient).filter(models.Patient.id == consultation.patient_id, models.Patient.doctor_id == current_doctor.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Fetch historical context (last 3 sessions)
    prev_sessions = db.query(models.Consultation).filter(models.Consultation.patient_id == patient.id).order_by(models.Consultation.created_at.desc()).limit(3).all()
    history_summaries = "\n".join([f"Session {s.created_at}: {s.ai_analysis.get('summary', '')}" for s in prev_sessions if s.ai_analysis])
    
    history_text = f"Profile History: {security.decrypt_data(patient.encrypted_history)}\nAllergies: {security.decrypt_data(patient.encrypted_allergies)}\nMedications: {security.decrypt_data(patient.encrypted_medications)}\n\nRecent Summaries:\n{history_summaries}"
    
    # 2. Run AI Analysis (using Secure ID)
    patient_secure_id = f"PATIENT_{patient.id}"
    analysis = ai_service.analyze_consultation(consultation.transcript, patient_secure_id, history_text)
    
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

@app.delete("/delete_consultation/{consultation_id}")
def delete_consultation(consultation_id: int, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    db_consultation = db.query(models.Consultation).filter(models.Consultation.id == consultation_id, models.Consultation.doctor_id == current_doctor.id).first()
    if not db_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    db.delete(db_consultation)
    db.commit()
    return {"message": "Consultation deleted successfully"}

@app.post("/chat_copilot")
def chat_copilot(chat: schemas.ChatMessage, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    # Fetch patient history
    patient = db.query(models.Patient).filter(models.Patient.id == chat.patient_id, models.Patient.doctor_id == current_doctor.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    history_text = f"Profile History: {security.decrypt_data(patient.encrypted_history)}\nAllergies: {security.decrypt_data(patient.encrypted_allergies)}\nMedications: {security.decrypt_data(patient.encrypted_medications)}"
    
    # Fetch latest consultation summary
    latest_consultation = db.query(models.Consultation).filter(models.Consultation.patient_id == chat.patient_id).order_by(models.Consultation.created_at.desc()).first()
    recent_summary = ""
    if latest_consultation and latest_consultation.ai_analysis:
        recent_summary = latest_consultation.ai_analysis.get("summary", "")

    # Ask the CoPilot (using Secure ID)
    patient_secure_id = f"PATIENT_{patient.id}"
    reply = ai_service.chat_with_copilot(patient_secure_id, history_text, recent_summary, chat.message)
    return {"reply": reply}

@app.post("/realtime_check", response_model=schemas.RealtimeCheckResponse)
def realtime_check(request: schemas.RealtimeCheckRequest, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    try:
        patient = db.query(models.Patient).filter(models.Patient.id == request.patient_id, models.Patient.doctor_id == current_doctor.id).first()
        if not patient:
            return schemas.RealtimeCheckResponse(warning="SAFE", diarized_text=request.transcript)
        
        # Fetch historical summaries for real-time watchdog
        prev_sessions = db.query(models.Consultation).filter(models.Consultation.patient_id == patient.id).order_by(models.Consultation.created_at.desc()).limit(2).all()
        history_summaries = "\n".join([f"Prev Session: {s.ai_analysis.get('summary', '')}" for s in prev_sessions if s.ai_analysis])

        history_text = f"Profile History: {security.decrypt_data(patient.encrypted_history)}\nAllergies: {security.decrypt_data(patient.encrypted_allergies)}\nMedications: {security.decrypt_data(patient.encrypted_medications)}\n\nRecent Context:\n{history_summaries}"
        
        patient_secure_id = f"PATIENT_{patient.id}"
        res = ai_service.check_realtime(request.transcript, patient_secure_id, history_text)
        
        return schemas.RealtimeCheckResponse(
            warning=res.get("warning", "SAFE"),
            diarized_text=res.get("diarized_text", request.transcript)
        )
    except Exception as e:
        # Never crash the session over a realtime AI check
        return schemas.RealtimeCheckResponse(warning="SAFE", diarized_text=request.transcript)

@app.post("/verify_prescription", response_model=schemas.PrescriptionVerifyResponse)
def verify_prescription(request: schemas.PrescriptionVerifyRequest, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == request.patient_id, models.Patient.doctor_id == current_doctor.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    history_text = security.decrypt_data(patient.encrypted_history)
    allergies_text = security.decrypt_data(patient.encrypted_allergies)
    
    res = ai_service.verify_prescription(
        request.prescription,
        history_text,
        allergies_text,
        request.session_summary
    )
    
    return schemas.PrescriptionVerifyResponse(
        status=res.get("status", "WARNING"),
        reason=res.get("reason", "Unknown verification outcome."),
        suggestions=res.get("suggestions", "")
    )

@app.post("/medical_coding", response_model=schemas.MedicalCodingResponse)
def medical_coding(request: schemas.MedicalCodingRequest, current_doctor: models.Doctor = Depends(get_current_doctor)):
    return ai_service.perform_medical_coding(request.clinical_note)

@app.post("/adjudicate_claim", response_model=schemas.ClaimAdjudicationResponse)
def adjudicate_claim(request: schemas.ClaimAdjudicationRequest, current_doctor: models.Doctor = Depends(get_current_doctor)):
    return ai_service.adjudicate_claim(
        request.patient_id, 
        request.diagnosis_codes, 
        request.procedure_codes, 
        request.authorization, 
        request.total_claimed_amount, 
        request.policy_reference
    )

@app.post("/prior_auth", response_model=schemas.PriorAuthResponse)
def prior_auth(request: schemas.PriorAuthRequest, current_doctor: models.Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == request.patient_id, models.Patient.doctor_id == current_doctor.id).first()
    context = ""
    if patient:
        context = f"History: {security.decrypt_data(patient.encrypted_history)} | Meds: {security.decrypt_data(patient.encrypted_medications)}"
    
    return ai_service.process_prior_auth(request.requested_service, request.clinical_justification, context)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
