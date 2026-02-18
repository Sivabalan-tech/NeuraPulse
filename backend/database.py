from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/baymax_db")

client = MongoClient(MONGO_URI)
db = client.get_database()

def get_db():
    return db
