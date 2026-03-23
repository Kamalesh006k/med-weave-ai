import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating database for status and severity...")
    try:
        conn.execute(text("ALTER TABLE patients ADD COLUMN status VARCHAR(50) DEFAULT 'Scheduled'"))
        print("Added 'status' column.")
    except Exception as e:
        print(f"Skipping 'status': {e}")
        
    try:
        conn.execute(text("ALTER TABLE patients ADD COLUMN severity VARCHAR(50) DEFAULT 'Normal'"))
        print("Added 'severity' column.")
    except Exception as e:
        print(f"Skipping 'severity': {e}")
    
    conn.commit()
    print("Migration complete.")
