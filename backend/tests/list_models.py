import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")
print(f"Key: {key[:10]}...")

genai.configure(api_key=key)

try:
    print("Attempting to list models...")
    for m in genai.list_models():
        print(f"Model found: {m.name}")
    print("SUCCESS: Key is valid.")
except Exception as e:
    print(f"LIST MODELS FAILED: {str(e)}")
