import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

model = genai.GenerativeModel("gemini-1.5-flash") # or gemini-pro

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
- Output MUST be in strict JSON format.

JSON Structure:
{{
  "alerts": [
    {{ "severity": "HIGH|MEDIUM|LOW", "type": "RiskType", "message": "Description" }}
  ],
  "summary": "Concise medical summary of the session",
  "patient_explanation": "A simplified, empathetic explanation for the patient"
}}
"""

def analyze_consultation(transcript: str, patient_history: str):
    if not GEMINI_KEY:
        return {
            "alerts": [{"severity": "LOW", "type": "System", "message": "AI analysis unavailable - check API key"}],
            "summary": "Analysis skipped due to missing configuration.",
            "patient_explanation": "Thank you for sharing your concerns with your doctor today."
        }

    try:
        response = model.generate_content(
            PROMPT_TEMPLATE.format(history=patient_history, transcript=transcript),
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "alerts": [{"severity": "HIGH", "type": "Error", "message": f"AI analysis failed: {str(e)}"}],
            "summary": "Error during analysis.",
            "patient_explanation": "There was a technical issue processing the consultation notes."
        }
        }

    try:
        response = model.generate_content(
            PROMPT_TEMPLATE.format(history=patient_history, transcript=transcript),
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "alerts": [{"severity": "HIGH", "type": "Error", "message": f"AI analysis failed: {str(e)}"}],
            "summary": "Error during analysis.",
            "patient_explanation": "There was a technical issue processing the consultation notes."
        }
