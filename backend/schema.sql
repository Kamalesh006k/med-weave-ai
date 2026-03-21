-- MedWeave AI PostgreSQL Schema

-- 1. Doctors Table (Auth)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255)
);

-- 2. Patients Table (Encrypted)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(id),
    encrypted_name TEXT NOT NULL,
    encrypted_history TEXT,
    encrypted_allergies TEXT,
    encrypted_medications TEXT
);

-- 3. Consultations Table
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    transcript TEXT,
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_patients_doctor ON patients(doctor_id);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
