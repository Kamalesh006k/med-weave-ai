from passlib.context import CryptContext
from passlib.hash import argon2
import sqlite3

pwd_context = CryptContext(schemes=["bcrypt", "argon2"], deprecated="auto")

def diagnose():
    try:
        conn = sqlite3.connect('medweave.db')
        cursor = conn.cursor()
        cursor.execute("SELECT email, hashed_password FROM doctors")
        users = cursor.fetchall()
        
        for email, h in users:
            print(f"User: {email}")
            print(f"Hash: {h}")
            print(f"Segments: {len(h.split('$'))}")
            
            try:
                identified = pwd_context.identify(h)
                print(f"Identified as: {identified}")
            except Exception as e:
                print(f"Identify error: {e}")
                
            # Try to see if it's a legacy or malformed argon2
            if h.startswith('$argon2id$'):
                print("Starts with $argon2id$, testing manual match...")
                # Standard format should have 6 parts if it starts with $
                # $argon2id$v=19$m=65536,t=3,p=4$salt$hash
                # splitting by $ gives ['', 'argon2id', 'v=19', 'm=...', 'salt', 'hash']
                # so len should be 6
    finally:
        conn.close()

if __name__ == "__main__":
    diagnose()
