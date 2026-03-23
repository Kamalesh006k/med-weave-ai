import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")
if key:
    print(f"Key found. Length: {len(key)}")
    print(f"Hex: {' '.join(hex(ord(c)) for c in key)}")
else:
    print("KEY NOT FOUND")

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=key,
)

try:
    response = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[{"role": "user", "content": "Say hi"}],
    )
    print("AI SUCCESS")
except Exception as e:
    print(f"AI FAILED: {str(e)}")
