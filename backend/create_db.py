import pymysql

# Connection details
host = 'localhost'
user = 'root'
password = 'admin@123'
db_name = 'medweave'

try:
    # Connect without database specified
    connection = pymysql.connect(host=host, user=user, password=password)
    cursor = connection.cursor()
    
    # Create database
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
    print(f"Database '{db_name}' created or already exists.")
    
    connection.close()
except Exception as e:
    print(f"Error creating database: {e}")
