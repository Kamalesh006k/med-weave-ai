# MedWeave AI

MedWeave AI is a unified healthcare dashboard that handles clinical notes and automated insurance operations. It uses AI agents to help doctors with live consultations, medical coding, and claim adjudication.

## Getting Started

Follow these steps to set up the project on your local machine. You'll need to run both the backend (Python) and the frontend (Next.js) simultaneously.

### 1. Backend Setup (FastAPI)

Go to the `backend` folder:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

Install the required packages:
```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder and add your Gemini API key:
```env
GEMINI_API_KEY=your_google_ai_studio_key_here
```

Start the backend server:
```bash
uvicorn app.main:app --reload
```
The backend will run on `http://127.0.0.1:8000`.

---

### 2. Frontend Setup (Next.js)

Open a new terminal window at the project root:

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## Initial Login

Once both servers are running, you can log in using these default credentials:
- **Email**: `doctor@medweave.ai`
- **Password**: `password123`

## Documentation

For more detailed information on how the system works, check out these files:
- `architecture_document.md`: For technical implementation details.
- `impact_model.md`: For business and ROI analysis.
- `hackathon_report.md`: For the project pitch and innovation summary.
