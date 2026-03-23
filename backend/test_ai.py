import os
from dotenv import load_dotenv
import sys
import json

# Add the backend directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import ai_service

def test_ai():
    print("Testing AI Service...")
    load_dotenv()
    
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("ERROR: GEMINI_API_KEY not found in environment!")
        return

    print(f"Using API Key: {key[:5]}...{key[-5:]}")
    
    sample_note = "Patient John Doe, 45 years old. History of hypertension. Allergic to penicillin. Currently taking Lisinopril."
    print(f"Sample Note: {sample_note}")
    print("-" * 20)
    
    try:
        # Check if client is initialized
        if ai_service.client is None:
            print("ERROR: AI client (OpenAI) is not initialized in ai_service.py")
            return
            
        print("Calling ai_service.parse_clinical_note...")
        result = ai_service.parse_clinical_note(sample_note)
        print("Result from Gemini:")
        print(json.dumps(result, indent=2))
        
        if result.get("name") and ("John" in result.get("name")):
            print("\nSUCCESS: AI correctly parsed the name.")
        elif result.get("history") == "API Key Missing":
             print("\nERROR: ai_service reports API Key Missing.")
        else:
            print("\nWARNING: AI output looks unexpected.")
            
    except Exception as e:
        print(f"\nERROR: AI Service failed with exception: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_ai()
