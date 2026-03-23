import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=key)

try:
    print("Testing gemini-pro...")
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("Hi")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {str(e)}")
