# MedWeave AI - Setup Guide

This guide will help you get the MedWeave AI system up and running.

## Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** instance

---

## 1. Backend Setup (FastAPI)

1.  **Navigate to the backend folder**:
    ```bash
    cd backend
    ```
2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
      # On Windows
    source venv/bin/activate # On Unix
    ```
3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configure Environment**:
    - Rename `.env.example` to `.env`.
    - Set your `DATABASE_URL` (e.g., `postgresql://user:pass@localhost:5432/medweave`).
    - Generate an `ENCRYPTION_KEY`: Run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
    - Set your `OPENAI_API_KEY`.
5.  **Run the backend**:
    ```bash
    uvicorn app.main:app --reload
    ```

---

## 2. Frontend Setup (Next.js)

1.  **Navigate to the root directory**:
    ```bash
    cd ..
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    - Check `.env.local` is set to `NEXT_PUBLIC_API_URL=http://localhost:8000`.
4.  **Run the frontend**:
    ```bash
    npm run dev
    ```

---

## 3. Database Initialization
The backend will automatically create the necessary tables in your PostgreSQL database upon the first run, provided the connection string is correct. Alternatively, you can run the SQL in `backend/schema.sql` manually.

## 4. Security Note
- All patient data is encrypted using **Fernet (AES)** before storage.
- **Do NOT** lose your `ENCRYPTION_KEY`, as data cannot be recovered without it.
- Patient identifiers are never sent to the AI; only clinical history and transcripts are used for reasoning.
venv\Scripts\activate