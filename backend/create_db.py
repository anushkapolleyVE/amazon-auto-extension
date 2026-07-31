import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    # Connect to the default 'postgres' database first to create our new one
    conn = psycopg2.connect(
        user="postgres",
        password="Pass123",
        host="localhost",
        port="5432",
        database="postgres" # Default DB
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Create the database
    cursor.execute('CREATE DATABASE amazon_extension;')
    print("Database 'amazon_extension' created successfully!")
    
    cursor.close()
    conn.close()
except psycopg2.errors.DuplicateDatabase:
    print("Database 'amazon_extension' already exists!")
except Exception as e:
    print(f"Error creating database: {e}")
