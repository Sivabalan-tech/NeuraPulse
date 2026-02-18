from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId
import datetime

sensors_bp = Blueprint('sensors', __name__)

@sensors_bp.route('', methods=['GET'])
def get_readings():
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 50))
    
    db = get_db()
    readings = list(db.sensor_readings.find({"user_id": user_id}).sort("recorded_at", -1).limit(limit))
    
    for reading in readings:
        reading['id'] = str(reading.pop('_id'))
        
    return jsonify(readings)

@sensors_bp.route('', methods=['POST'])
def save_reading():
    data = request.json
    db = get_db()
    
    new_reading = {
        "user_id": data['user_id'],
        "reading_type": data['reading_type'],
        "value": data['value'],
        "unit": data['unit'],
        "source": data['source'],
        "device_name": data.get('device_name'),
        "recorded_at": datetime.datetime.utcnow().isoformat()
    }
    
    res = db.sensor_readings.insert_one(new_reading)
    return jsonify({"message": "Saved", "id": str(res.inserted_id)}), 201
