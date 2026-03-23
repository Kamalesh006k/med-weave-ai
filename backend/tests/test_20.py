import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("GEMINI_API_KEY")

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=key,
)

try:
    print("Testing gemini-2.0-flash...")
    response = client.chat.completions.create(
        model="gemini-2.0-flash",
        messages=[{"role": "user", "content": "hi"}],
    )
    print(f"SUCCESS: {response.choices[0].message.content}")
except Exception as e:
    print(f"FAILED: {str(e)}")
