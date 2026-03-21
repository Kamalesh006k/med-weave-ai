from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("ENCRYPTION_KEY")
print(f"Key: '{key}'")
print(f"Length: {len(key) if key else 0}")
try:
    f = Fernet(key.encode())
    print("Key is valid")
except Exception as e:
    print(f"Error: {e}")
