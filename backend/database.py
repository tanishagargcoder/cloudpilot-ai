import os
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# ── Connection ────────────────────────────────────────────────────────────────
MONGODB_URL = os.getenv("MONGODB_URL")
client = None
db = None


def get_db():
    global client, db
    if db is None:
        try:
            client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
            client.server_info()
            db = client["cloudpilot"]
            print("✅ MongoDB connected successfully")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            db = None
    return db


def _clean(doc: dict) -> dict:
    """Remove MongoDB _id field to avoid ObjectId serialization errors."""
    if doc is None:
        return {}
    return {k: v for k, v in doc.items() if k != "_id"}


# ── Incidents ─────────────────────────────────────────────────────────────────
def save_incident(incident: dict) -> bool:
    try:
        database = get_db()
        if database is None:
            return False
        clean = _clean(incident)
        database["incidents"].insert_one(clean)
        # remove _id added by pymongo after insert
        clean.pop("_id", None)
        return True
    except Exception as e:
        print(f"Error saving incident: {e}")
        return False


def get_incidents(limit: int = 20) -> list:
    try:
        database = get_db()
        if database is None:
            return []
        docs = list(
            database["incidents"]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        return docs
    except Exception as e:
        print(f"Error fetching incidents: {e}")
        return []


def update_incident_status(incident_id: str, status: str) -> bool:
    try:
        database = get_db()
        if database is None:
            return False
        database["incidents"].update_one(
            {"id": incident_id},
            {"$set": {"status": status, "resolved_at": datetime.utcnow().isoformat()}}
        )
        return True
    except Exception as e:
        print(f"Error updating incident: {e}")
        return False


# ── Notifications ─────────────────────────────────────────────────────────────
def save_notification(notification: dict) -> bool:
    try:
        database = get_db()
        if database is None:
            return False
        clean = _clean(notification)
        database["notifications"].insert_one(clean)
        clean.pop("_id", None)
        return True
    except Exception as e:
        print(f"Error saving notification: {e}")
        return False


def get_notifications(limit: int = 50) -> list:
    try:
        database = get_db()
        if database is None:
            return []
        docs = list(
            database["notifications"]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        return docs
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return []


def mark_notification_read(notif_id: str) -> bool:
    try:
        database = get_db()
        if database is None:
            return False
        database["notifications"].update_one(
            {"id": notif_id},
            {"$set": {"read": True}}
        )
        return True
    except Exception as e:
        print(f"Error marking notification: {e}")
        return False