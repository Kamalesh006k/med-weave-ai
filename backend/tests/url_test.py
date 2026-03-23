import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")

# Try without the /openai/ suffix if that was the issue
client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/",
    api_key=key,
)

try:
    print("Testing alternative base_url...")
    response = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[{"role": "user", "content": "hi"}],
    )
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {str(e)}")
