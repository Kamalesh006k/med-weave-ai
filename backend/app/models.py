from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))

    patients = relationship("Patient", back_populates="doctor")
    consultations = relationship("Consultation", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    
    # Encrypted fields stored as strings (base64)
    encrypted_name = Column(Text, nullable=False)
    encrypted_history = Column(Text)
    encrypted_allergies = Column(Text)
    encrypted_medications = Column(Text)
    department = Column(String(100), default="all")
    time_slot = Column(String(50)) # e.g. "10:30 AM"
    status = Column(String(50), default="Scheduled") # Scheduled, In Progress, Completed
    severity = Column(String(50), default="Normal") # Normal, High, Critical
    
    doctor = relationship("Doctor", back_populates="patients")
    consultations = relationship("Consultation", back_populates="patient", cascade="all, delete-orphan")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    
    transcript = Column(Text)
    ai_analysis = Column(JSON) # JSONB in Postgres
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("Doctor", back_populates="consultations")
