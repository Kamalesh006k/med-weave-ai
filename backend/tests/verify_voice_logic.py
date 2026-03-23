import os
import sys
import json
from dotenv import load_dotenv

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import ai_service

def verify_diarization_and_safety():
    print("--- Verifying Voice Classification & Prescription Safety ---")
    # Search for .env in current, parent or backend folder
    load_dotenv('.env')
    load_dotenv('../.env')
    load_dotenv('backend/.env')
    
    patient_id = "PATIENT_101"
    history = "Profile History: Patient is allergic to Penicillin and has a history of high blood pressure.\nRecent Context: Prev Session: Patient complained of chest tightness."
    
    # Test 1: Safe Consultation
    print("\nTest 1: Safe Consultation")
    transcript_safe = "Patient: My chest feels better today. Doctor: Glad to hear that. Keep taking your Lisinopril."
    res_safe = ai_service.check_realtime(transcript_safe, patient_id, history)
    print(f"Transcript: {transcript_safe}")
    print(f"Safety Warning: {res_safe.get('warning')}")
    print(f"Diarized Text:\n{res_safe.get('diarized_text')}")
    
    # Test 2: Prescription Conflict (Allergy)
    print("\nTest 2: Prescription Conflict (Allergy)")
    transcript_conflict = "Patient: I have a sore throat now. Doctor: I see. I will prescribe some Amoxicillin for that."
    res_conflict = ai_service.check_realtime(transcript_conflict, patient_id, history)
    print(f"Transcript: {transcript_conflict}")
    print(f"Safety Warning: {res_conflict.get('warning')}")
    print(f"Diarized Text:\n{res_conflict.get('diarized_text')}")
    
    # Test 3: Contextual Symptom Conflict
    print("\nTest 3: Contextual Symptom Conflict")
    transcript_symptom = "Patient: My heart is racing and I feel very dizzy. Doctor: Let's give you some pseudoephedrine for that congestion."
    res_symptom = ai_service.check_realtime(transcript_symptom, "PAT_001", "History: Chronic Tachycardia")
    print(f"Transcript: {transcript_symptom}")
    print(f"Safety Warning: {res_symptom.get('warning')}")
    print(f"Diarized Text:\n{res_symptom.get('diarized_text')}")

    # Test 4: Diagnostic Misunderstanding
    print("\nTest 4: Diagnostic Misunderstanding")
    transcript_mis = "Patient: I have crushing chest pain and it spreads to my left arm. Doctor: It's likely just a bit of acid reflux, don't worry."
    res_mis = ai_service.check_realtime(transcript_mis, "PAT_002", "History: Hypertension, High Cholesterol")
    print(f"Transcript: {transcript_mis}")
    print(f"Safety Warning: {res_mis.get('warning')}")
    print(f"Diarized Text:\n{res_mis.get('diarized_text')}")

if __name__ == "__main__":
    verify_diarization_and_safety()
