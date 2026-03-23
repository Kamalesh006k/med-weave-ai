import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=key,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MedWeave AI Diagnostics",
    }
)

try:
    print("Testing OpenRouter (google/gemini-2.0-flash-001)...")
    response = client.chat.completions.create(
        model="google/gemini-2.0-flash-001",
        messages=[{"role": "user", "content": "Respond with 'OPENROUTER_ACTIVE'"}],
    )
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"FAILED: {str(e)}")
