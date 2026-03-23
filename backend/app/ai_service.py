import os
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=GEMINI_API_KEY,
) if GEMINI_API_KEY else None

# Use Gemini directly
MODEL = "gemini-2.5-flash"

PROMPT_TEMPLATE = """
You are MedWeave AI, a clinical decision support assistant.
Your task is to analyze a medical consultation transcript combined with patient history.

DETECT:
1. Potential Drug Interactions (if medications mentioned)
2. Missing Symptoms (what else should the doctor ask?)
3. High-Risk Conditions (potential emergencies)
4. Contradictions (between history and current symptoms)

PATIENT HISTORY:
{history}

TRANSCRIPT:
{transcript}

RULES:
- DO NOT prescribe medication.
- DO NOT provide a final diagnosis.
- ONLY provide suggestions and alerts for the doctor to review.
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

def analyze_consultation(transcript: str, patient_history: str):
    if not client:
        return {
            "alerts": [{"severity": "LOW", "type": "System", "message": "AI analysis unavailable - check API key"}],
            "summary": "Analysis skipped due to missing configuration.",
            "patient_explanation": "Thank you for sharing your concerns with your doctor today."
        }
    try:
        text = _call(PROMPT_TEMPLATE.format(history=patient_history, transcript=transcript))
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
        text = _call(PROMPT_INTAKE.format(note=note))
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

Output ONLY the briefing paragraph. No JSON. No markdown.
"""

def generate_briefing(patients_info: str):
    if not client:
        return "AI Briefing unavailable. Please review patient records manually."
    try:
        return _call(PROMPT_BRIEFING.format(patients_info=patients_info))
    except Exception as e:
        return f"Could not generate briefing: {str(e)}"

PROMPT_CHAT = """
You are MedWeave AI Co-Pilot assisting a doctor during a consultation.
Patient context and history:
{history}

Recent Diagnostic Synthesis:
{recent_summary}

Doctor's Question:
{message}

Provide a concise, professional, evidence-based response. No markdown headers.
"""

def chat_with_copilot(history_text: str, recent_summary: str, message: str):
    if not client:
        return "Co-Pilot is currently offline. Please check your system configuration."
    try:
        return _call(PROMPT_CHAT.format(history=history_text, recent_summary=recent_summary, message=message))
    except Exception as e:
        return f"Co-Pilot error: {str(e)}"

PROMPT_REALTIME_CHECK = """
You are MedWeave AI, a clinical safety monitor.
Listen to the following live, ongoing dictation from a doctor.
Patient History:
{history}

Current live dictation:
{transcript}

Does the doctor say anything blatantly wrong, dangerous, or contraindicated based on the history or medical knowledge? 
If YES, respond with a short warning (max 1 sentence) starting with "WARNING:".
If NO, or if incomplete, respond EXACTLY with "SAFE".
"""

def check_realtime(transcript: str, patient_history: str):
    if not client:
        return "SAFE"
    try:
        reply = _call(PROMPT_REALTIME_CHECK.format(history=patient_history, transcript=transcript))
        return reply
    except Exception:
        return "SAFE"
