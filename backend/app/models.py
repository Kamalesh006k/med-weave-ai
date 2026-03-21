from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)

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
    
    doctor = relationship("Doctor", back_populates="patients")
    consultations = relationship("Consultation", back_populates="patient")

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
