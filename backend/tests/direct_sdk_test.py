import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {key[:10]}...")

genai.configure(api_key=key)

try:
    print("Sending test request to Gemini (Direct SDK)...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say hi")
    print("Response received:")
    print(response.text)
except Exception as e:
    print(f"DIRECT SDK FAILED: {str(e)}")
