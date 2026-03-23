import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=key)

with open('backend/tests/models_list.txt', 'w') as f:
    try:
        for m in genai.list_models():
            f.write(f"{m.name}\n")
        f.write("SUCCESS\n")
    except Exception as e:
        f.write(f"FAILED: {str(e)}\n")
