import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {key[:10]}... (Length: {len(key) if key else 0})")

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=key,
)

try:
    print("Sending test request to Gemini...")
    response = client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[{"role": "user", "content": "Say hello world"}],
    )
    print("Response received:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"FAILED: {str(e)}")
