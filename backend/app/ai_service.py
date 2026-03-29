import os
from openai import OpenAI
from dotenv import load_dotenv
import json
from typing import List

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
        max_tokens=1024,
        temperature=0.0,
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
You are MedWeave AI Safety Watchdog monitoring a LIVE clinical consultation.

ROLE: Analyze the live transcript and provide feedback.

TASK 1 — SPEAKER DIARIZATION:
- Identify Doctor vs Patient from context.
- Format as a labeled conversation.
- MAINTAIN speaker label consistency throughout.
- AUTO-CORRECT grammar, speech recognition artifacts, and minor phrasing errors silently in the diarized output. For example, if the doctor says "years" but clearly means "days" based on context, correct it to "days" in the output WITHOUT raising a warning. This is a speech-to-text system, expect transcription errors.

TASK 2 — CLINICAL SAFETY WATCHDOG (WARNING):
Your primary goal is to PREVENT HARM. Flag any interaction where the doctor's plan is dangerously inadequate or contradicts the patient's symptoms.
- **Dangerous Misdiagnosis/Dismissal**: Flag when 'Red Flag' symptoms are ignored or attributed to minor causes without proper exclusion (e.g., dismissing sharp Right Lower Quadrant pain as 'acidity' without considering appendicitis).
- **Inappropriate Medication**: Flag when a minor medication is given for potentially life-threatening symptoms.
- **Missed Critical Evaluation**: Flag when the doctor refuses or dismisses necessary tests/scans for high-risk symptoms.

Patient Context (Secure ID: {patient_id}):
{history}

Current Live Transcript:
{transcript}

OUTPUT RULES:
- STRICT JSON ONLY.
- BE PROACTIVE: If you see a potential clinical error, highlight it in the "warning" field.
- "warning": "[Concise clinical safety alert]" OR "SAFE".
- "diarized_text": "[Clean, grammar-corrected labeled conversation]".
- NO MARKDOWN FENCES. JUST THE JSON.
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
        try:
            # First try direct parse
            return json.loads(reply)
        except json.JSONDecodeError:
            # Try to extract the first/main JSON block
            start = reply.find('{')
            end = reply.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(reply[start:end])
            raise ValueError("No valid JSON found in AI response")
    except Exception as e:
        print(f"Realtime check error: {e}")
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

PROMPT_MEDICAL_CODING = """
You are an expert Medical Coder. Map the following clinical note to ICD-10 and CPT codes.
CLINICAL NOTE:
{note}

Output MUST be in strict JSON format.
{{
  "codes": [
    {{ "code": "ICD-10/CPT Code", "description": "Standard Description", "type": "ICD-10|CPT" }}
  ],
  "reasoning": "Detailed audit trail/reasoning for each code selected"
}}
"""

def perform_medical_coding(note: str):
    if not client: return {"codes": [], "reasoning": "AI offline."}
    try:
        prompt = PROMPT_MEDICAL_CODING.replace("{note}", note)
        reply = _call(prompt)
        start = reply.find('{')
        end = reply.rfind('}') + 1
        return json.loads(reply[start:end])
    except Exception as e:
        return {"codes": [], "reasoning": f"Error: {str(e)}"}

PROMPT_ADJUDICATION = """
You are a Medical Coding and Insurance Claim Adjudication Assistant.
Process the following healthcare request following this EXACT 6-STEP WORKFLOW:

STEP 1: Validate Input
- Check if Patient ID ({patient_id}), Diagnosis Codes ({dx}), and Procedure Codes ({cpt}) are present.
- Reject if codes are missing or invalid.

STEP 2: Medical Necessity Check
- Verify if each procedure (CPT) is clinically supported by the diagnosis (ICD-10).
- Reject if there is no clear clinical relationship.

STEP 3: Prior Authorization
- If any procedure is high-cost (e.g., MRI, surgery, biologics), check if Authorization ({auth}) is provided.
- If high-cost but not authorized, mark status as "Pending Authorization".

STEP 4: Apply Payer Policy ({policy})
- The Allowed Amount should GENERALLY EQUAL the Total Claimed Amount ({claimed}) unless there is a specific policy rule to reduce it.
- If procedure is high-cost, check for auth as per Step 3.

STEP 5: Adjudication
- Calculate total allowed amount in Rs.
- Insurance Payable = Allowed Amount * 0.8 (assuming 80% coverage).
- Patient Responsibility = Allowed Amount * 0.2 (assuming 20% co-pay).

STEP 6: Final Decision
Output MUST be in strict JSON format.

JSON Structure:
{{
  "status": "Approved | Partially Approved | Rejected | Pending Authorization",
  "allowed_amount": number,
  "insurance_payable": number,
  "patient_responsibility": number,
  "remarks": "Step-by-step reasoning for the final decision"
}}

INPUT DATA (All amounts in INR / Rs.):
Patient ID: {patient_id}
Diagnosis (ICD-10): {dx}
Procedures (CPT): {cpt}
Authorization Provided: {auth}
Total Claimed Amount (Rs.): {claimed}
"""

def adjudicate_claim(patient_id: str, dx: List[str], cpt: List[str], auth: str, claimed: float, policy: str):
    if not client: return {"status": "Rejected", "allowed_amount": 0, "insurance_payable": 0, "patient_responsibility": 0, "remarks": "AI offline."}
    try:
        prompt = PROMPT_ADJUDICATION.format(
            patient_id=patient_id,
            dx=", ".join(dx),
            cpt=", ".join(cpt),
            auth=auth,
            claimed=claimed,
            policy=policy
        )
        reply = _call(prompt)
        start = reply.find('{')
        end = reply.rfind('}') + 1
        return json.loads(reply[start:end])
    except Exception as e:
        return {"status": "Rejected", "allowed_amount": 0, "insurance_payable": 0, "patient_responsibility": 0, "remarks": f"Analysis Error: {str(e)}"}

PROMPT_PRIOR_AUTH = """
You are a Prior Authorization Specialist. Evaluate this request.
SERVICE: {service}
JUSTIFICATION: {justification}
PATIENT_CONTEXT: {context}

Output MUST be in strict JSON format.
{{
  "auth_number": "AUTH-XXXX",
  "status": "AUTHORIZED|DENIED|MORE_INFO_REQUIRED",
  "reasoning": "Full rationale with clinical evidence",
  "criteria_met": ["Clinical criteria met list"],
  "criteria_failed": ["Clinical criteria failed list"]
}}
"""

def process_prior_auth(service: str, justification: str, context: str):
    if not client: return {"status": "DENIED", "reasoning": "AI offline.", "criteria_met": [], "criteria_failed": []}
    try:
        prompt = PROMPT_PRIOR_AUTH.replace("{service}", service).replace("{justification}", justification).replace("{context}", context)
        reply = _call(prompt)
        start = reply.find('{')
        end = reply.rfind('}') + 1
        return json.loads(reply[start:end])
    except Exception as e:
        return {"status": "DENIED", "reasoning": f"Error: {str(e)}", "criteria_met": [], "criteria_failed": []}
