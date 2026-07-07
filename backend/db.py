from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGODB_URI"))

db = client["cloudpilot"]

incidents = db["incidents"]
notifications = db["notifications"]