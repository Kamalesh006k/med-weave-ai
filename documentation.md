# MedWeave AI: Comprehensive Platform Documentation

**MedWeave AI** is a state-of-the-art, AI-driven healthcare platform designed to bridge the gap between clinical excellence and administrative efficiency. It provides doctors with real-time clinical intelligence while automating complex operational workflows like medical coding and insurance adjudication.

---

## 1. Core Clinical Features

### 🩺 Dashboard & Clinical Directory
The central hub for managing patient records. 
- **Patient Vault**: Secure storage of patient history, allergies, and medications.
- **Smart Filtering**: Filter patients by department (Cardiology, Neurology, OPD, etc.), clinical severity (Normal, High, Critical), and appointment status.
- **Registration Hub**: Manual and AI-assisted patient registration with selectable time slots.

### 🎙️ Live Consultation Room
A high-performance workspace for real-time doctor-patient interactions.
- **Live Transcription**: Real-time voice-to-text conversion of the consultation.
- **Real-time Risk Detection**: An AI agent monitors the conversation to detect:
    - Dangerous misdiagnoses.
    - Dismissal of "Red Flag" symptoms.
    - Inappropriate prescriptions or drug-drug interactions.
- **Missed Question Detector**: Suggests follow-up questions based on patient symptoms to ensure no critical detail is missed.

### 📄 Clinical Intelligence Engine
After a session, the system generates:
- **Medical Summaries**: Concise, professional summaries of the encounter.
- **Patient Explanations**: Empathetic, simplified versions of the consultation for patients to take home.
- **Prescription Verification**: Automatic cross-referencing of prescriptions against patient allergies and history.

---

## 2. Healthcare Operations Hub

The **Operations Hub** is a dedicated administrative module that uses specialized AI agents to handle complex rule-sets (ICD-10, CPT, Payer Policies).

### 🏷️ Medical Coding Agent
Maps clinical notes to standardized medical codes.
- **Supported Standards**: ICD-10 (Diagnoses) and CPT (Procedures).
- **Auditable Reasoning**: Provides the clinical rationale for each code assigned.

### 🏦 Claims Adjudication Agent
A refined, 6-step financial workflow for processing insurance claims:
1.  **Validation**: Verifies existence of Patient ID, Diagnosis, and Procedure codes.
2.  **Medical Necessity**: Links procedures to diagnoses to ensure clinical justification.
3.  **Prior Authorization**: Checks if high-cost services (e.g., MRI) have the required authorization status.
4.  **Payer Policy (e.g., BlueCross v4.1)**: Maps CPT codes to "Allowed Amounts" in **Rs.**
5.  **Financial Split**: Calculates the 80/20 split (Insurance Payable vs. Patient Responsibility).
6.  **Final Decision**: Returns a deterministic JSON output with step-by-step remarks.

### 🛡️ Prior Authorization Agent
Automates the evaluation of service requests.
- **Criteria Matching**: Matches requested services against patient history and clinical necessity.
- **Decision Matrix**: Returns "AUTHORIZED", "DENIED", or "MORE_INFO_REQUIRED" with detailed clinical reasoning.

---

## 3. Technical Architecture

### 🏗️ Technical Architecture & Stack

#### **Intelligence Layer**
- **LLM Engine**: Google Gemini Pro (State-of-the-art Generative AI).
- **Control Strategy**: Deterministic execution (Temperature 0.0) for mission-critical medical logic.
- **Data Schemas**: Pydantic v2 for structured request/response enforcement.

#### **Backend (Python Ecosystem)**
- **Web Framework**: **FastAPI** (Python 3.12) - asynchronous high-performance framework.
- **Server Gateway**: **Uvicorn** (ASGI).
- **ORM & Data**: **SQLAlchemy 2.0** with **SQLite** for high-integrity clinical record storage.
- **Security Protocols**: **JWT (JSON Web Tokens)** + **Passlib (Argon2)** for robust doctor authentication.

#### **Frontend (Modern App Stack)**
- **Framework**: **Next.js 16** (App Router Architecture).
- **Runtime**: **React 19** (Concurrent Rendering).
- **State Management**: React Context & Hooks.
- **Design System**: Custom **Vanilla CSS3** (Medical Aesthetics) with glassmorphism and motion.
- **Utility CSS**: **Tailwind CSS 4**.
- **Icons & Motion**: **Lucide React** & **Framer Motion**.
- **Communication**: **Axios** (Promise-based HTTP client).

#### **Development Lifecycle**
- **Node Environment**: Node.js 20+ / NPM.
- **Python Environment**: Python 3.12+ / Pip.
- **Validation Suite**: ESLint + Pydantic.

### 🧬 Data Flow & Schemas
- **Schemas**: Pydantic models in `backend/app/schemas.py` enforce strict data types for both API requests and AI responses.
- **AI Service**: `backend/app/ai_service.py` houses the core "Prompt Engineering" logic and agent instructions.
- **Security**: JWT-based authentication for doctors ensuring HIPAA-compliant access to clinical data.

---

## 4. Operational Best Practices
- **Deterministic AI**: The system uses `temperature=0.0` for all operational tasks to ensure consistent results for the same input.
- **Token Efficiency**: AI requests are capped at `1024 tokens` to optimize performance and reduce API costs.
- **Auditable Trails**: Every AI decision (coding, adjudication, auth) includes a `remarks` or `reasoning` field to allow for human-in-the-loop verification.

---

> [!NOTE]
> All financial values across the platform are localized to **Indian Rupees (Rs.)**.
