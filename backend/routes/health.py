from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId
import datetime

health_bp = Blueprint('health_logs', __name__)

@health_bp.route('', methods=['GET'])
def get_logs():
    user_id = request.args.get('user_id')
    date = request.args.get('date')
    db = get_db()
    
    query = {"user_id": user_id}
    if date:
        query["log_date"] = date
        
    logs = list(db.health_logs.find(query))
    for log in logs:
        log['id'] = str(log.pop('_id'))
        
    if date:
        return jsonify(logs[0] if logs else {})
    return jsonify(logs)

@health_bp.route('', methods=['POST'])
def save_log():
    data = request.json
    db = get_db()
    
    # Check if exists for date
    existing = db.health_logs.find_one({
        "user_id": data['user_id'],
        "log_date": data['log_date']
    })
    
    update_fields = {
        "symptoms": data.get('symptoms'),
        "medications": data.get('medications'),
        "mood": data.get('mood'),
        "sleep_hours": data.get('sleep_hours'),
        "energy_level": data.get('energy_level'),
        "notes": data.get('notes'),
        "updated_at": datetime.datetime.utcnow()
    }
    
    # Remove None values to avoid overwriting with null if partial update (though usually full form is sent)
    # But for 'MedicationTracking' which only sends medications, we need to be careful.
    # If caller sends only medications, we should only update medications.
    
    if existing:
        # If partial update (like from MedicationTracking), only update present fields
        # But wait, MedicationTracking sends user_id, log_date, medications. 
        # HealthLogForm sends everything.
        
        # Construct $set object dynamically
        set_data = {"updated_at": datetime.datetime.utcnow()}
        for key in ["symptoms", "medications", "mood", "sleep_hours", "energy_level", "notes"]:
            if key in data:
                set_data[key] = data[key]
        
        db.health_logs.update_one(
            {"_id": existing['_id']},
            {"$set": set_data}
        )
        return jsonify({"message": "Updated", "id": str(existing['_id'])})
    else:
        new_log = {
            "user_id": data['user_id'],
            "log_date": data['log_date'],
            "symptoms": data.get('symptoms'),
            "medications": data.get('medications'),
            "mood": data.get('mood'),
            "sleep_hours": data.get('sleep_hours'),
            "energy_level": data.get('energy_level'),
            "notes": data.get('notes'),
            "created_at": datetime.datetime.utcnow()
        }
        res = db.health_logs.insert_one(new_log)
        return jsonify({"message": "Created", "id": str(res.inserted_id)}), 201

@health_bp.route('/<id>', methods=['DELETE'])
def delete_log(id):
    db = get_db()
    db.health_logs.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Deleted"}), 200
