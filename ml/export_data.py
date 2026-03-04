import psycopg2
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL="postgresql://postgres.apabowiyhzrwsbtrvvpc:Kokidarshan@2004!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true")   
query = """
SELECT type, amount, date
FROM transactions
ORDER BY date;
"""

df = pd.read_sql(query, conn)

df.to_csv("transactions.csv", index=False)
print("✅ transactions.csv created from real DB data")
