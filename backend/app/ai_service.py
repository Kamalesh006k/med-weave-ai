import os
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Use OpenRouter for more model flexibility
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY if OPENROUTER_API_KEY else GEMINI_API_KEY,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MedWeave AI",
    }
) if (OPENROUTER_API_KEY or GEMINI_API_KEY) else None

MODEL = "google/gemini-2.0-flash-001"

PROMPT_TEMPLATE = """
You are MedWeave AI, a clinical decision support assistant.
Your task is to analyze a medical consultation transcript combined with patient history.

DETECT:
1. Potential Drug Interactions (if medications mentioned)
2. Missing Symptoms (what else should the doctor ask?)
3. High-Risk Conditions (potential emergencies)
4. Contradictions (between history and current symptoms)

PATIENT CONTEXT:
Patient ID: {patient_id}
{history}

TRANSCRIPT:
{transcript}

RULES:
- DO NOT prescribe medication.
- DO NOT provide a final diagnosis.
- ONLY provide suggestions and alerts for the doctor to review.
- DO NOT use emojis in your responses.
- Output MUST be in strict JSON format with no markdown code fences.

JSON Structure:
{{
  "alerts": [
    {{ "severity": "HIGH|MEDIUM|LOW", "type": "RiskType", "message": "Description" }}
  ],
  "summary": "Concise medical summary of the session",
  "patient_explanation": "A simplified, empathetic explanation for the patient"
}}
"""

def _call(prompt: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()

def analyze_consultation(transcript: str, patient_id: str, patient_history: str):
    if not client:
        return {
            "alerts": [{"severity": "LOW", "type": "System", "message": "AI analysis unavailable - check API key"}],
            "summary": "Analysis skipped due to missing configuration.",
            "patient_explanation": "Thank you for sharing your concerns with your doctor today."
        }
    try:
        prompt = PROMPT_TEMPLATE.replace("{patient_id}", str(patient_id)) \
                                .replace("{history}", patient_history) \
                                .replace("{transcript}", transcript)
        text = _call(prompt)
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        return {
            "alerts": [{"severity": "HIGH", "type": "Error", "message": f"AI analysis failed: {str(e)}"}],
            "summary": "Error during analysis.",
            "patient_explanation": "There was a technical issue processing the consultation notes."
        }

PROMPT_INTAKE = """
You are an AI Clinical Assistant. Extract structured information from the following raw clinical note.
If a field is not clear, leave it empty.

NOTE:
{note}

Output MUST be in strict JSON format with no markdown code fences.

JSON Structure:
{{
  "name": "Extracted full name",
  "history": "Concise medical history",
  "allergies": "List of allergies or 'None reported'",
  "medications": "List of medications or 'None reported'",
  "department": "Suggest one of: cardiology, neurology, oncology, pediatrics, or all"
}}
"""

def parse_clinical_note(note: str):
    if not client:
        return {"name": "Unknown", "history": "API Key Missing", "allergies": "", "medications": "", "department": "all"}
    try:
        prompt = PROMPT_INTAKE.replace("{note}", note)
        text = _call(prompt)
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        return {"name": "Error Parsing", "history": f"Error: {str(e)}", "allergies": "", "medications": "", "department": "all"}

PROMPT_BRIEFING = """
You are MedWeave AI, a Chief Medical Officer AI. 
Review this list of patients and their top-level info. 
Write a short, urgent, professional 2-sentence "Daily Briefing" for the doctor, identifying who needs immediate attention.

PATIENTS:
{patients_info}

Output ONLY the briefing paragraph. No JSON. No markdown. DO NOT use emojis.
"""

def generate_briefing(patients_info: str):
    if not client:
        return "AI Briefing unavailable. Please review patient records manually."
    try:
        prompt = PROMPT_BRIEFING.replace("{patients_info}", patients_info)
        return _call(prompt)
    except Exception as e:
        return f"Could not generate briefing: {str(e)}"

PROMPT_CHAT = """
You are MedWeave AI Co-Pilot assisting a doctor during a consultation.
Patient Context (Secure ID: {patient_id}):
{history}

Recent Diagnostic Synthesis:
{recent_summary}

Doctor's Question:
{message}

Provide a concise, professional, evidence-based response. No markdown headers. DO NOT use emojis.
"""

def chat_with_copilot(patient_id: str, history_text: str, recent_summary: str, message: str):
    if not client:
        return "Co-Pilot is currently offline. Please check your system configuration."
    try:
        prompt = PROMPT_CHAT.replace("{patient_id}", str(patient_id)) \
                            .replace("{history}", history_text) \
                                .replace("{recent_summary}", recent_summary) \
                                .replace("{message}", message)
        return _call(prompt)
    except Exception as e:
        return f"Co-Pilot error: {str(e)}"

PROMPT_REALTIME_CHECK = """
You are MedWeave AI, a high-speed clinical safety monitor.
Analyze this live consultation transcript and provide INSTANT feedback.

1. SPEAKER IDENTIFICATION: Distinguish between Patient and Doctor.
2. DIARIZATION: Format as a labeled conversation.
3. ERROR WATCHDOG: Flag ANY contradiction by the Physician. 
   - QUOTE the physician's error directly (e.g., "Doctor said X but Patient has Y").
   - CRITICAL: Detect "Diagnostic Misunderstandings" (e.g., if the doctor suggests a mild condition while symptoms/history suggest something severe like a cardiac event).
4. CONTEXTUAL ALERT: If a risk is found, explain it clearly in < 15 words.
5. CONSISTENCY: Maintain the SAME speaker assignments for previous sentences. If you already labeled a person as "Patient", keep it "Patient".

Patient Context (Secure ID: {patient_id}):
{history}

Current Live Transcript:
{transcript}

OUTPUT RULES:
- STRICT JSON ONLY.
- "warning": "[Concise risk/diagnostic alert]" OR "SAFE".
- "diarized_text": "[Labeled conversation]".
- DO NOT use emojis.
- MAINTAIN CONTINUITY: Do not change previous speaker labels.
"""

def check_realtime(transcript: str, patient_id: str, patient_history: str):
    if not client:
        return {"warning": "SAFE", "diarized_text": transcript}
    try:
        prompt = PROMPT_REALTIME_CHECK.replace("{patient_id}", str(patient_id)) \
                                      .replace("{history}", patient_history) \
                                      .replace("{transcript}", transcript)
        reply = _call(prompt)
        # Robust JSON extraction
        start = reply.find('{')
        end = reply.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(reply[start:end])
        return {"warning": "SAFE", "diarized_text": transcript}
    except Exception:
        return {"warning": "SAFE", "diarized_text": transcript}

PROMPT_PRESCRIPTION_VERIFY = """
You are MedWeave AI Safety Watchdog. Verify the following prescription.
PATIENT HISTORY: {history}
ALLERGIES: {allergies}
CURRENT SESSION FINDINGS: {summary}

PROPOSED PRESCRIPTION:
{prescription}

Analyze for:
1. Allergic contraindications.
2. Drug-drug interactions with current medications.
3. Clinical appropriateness given the session findings.

Output MUST be in strict JSON format.
{{
  "status": "APPROVED|WARNING|CRITICAL",
  "reason": "Detailed medical rationale for the status",
  "suggestions": "Alternative suggestions if any"
}}
"""

def verify_prescription(prescription: str, history: str, allergies: str, summary: str):
    if not client:
        return {"status": "WARNING", "reason": "AI verification offline."}
    try:
        prompt = PROMPT_PRESCRIPTION_VERIFY.replace("{history}", history) \
                                          .replace("{allergies}", allergies) \
                                          .replace("{summary}", summary) \
                                          .replace("{prescription}", prescription)
        reply = _call(prompt)
        start = reply.find('{')
        end = reply.rfind('}') + 1
        return json.loads(reply[start:end])
    except Exception as e:
        return {"status": "WARNING", "reason": f"Verification failed: {str(e)}"}
