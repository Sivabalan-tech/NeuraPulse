from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId
import datetime

meds_bp = Blueprint('medications', __name__)

# Middleware to verify token should be added here in production

@meds_bp.route('', methods=['GET'])
def get_meds():
    user_id = request.args.get('user_id') # In real app, get from token
    db = get_db()
    meds = list(db.medications.find({"user_id": user_id}))
    
    # Convert ObjectId to string
    for med in meds:
        med['id'] = str(med.pop('_id'))
        
    return jsonify(meds)

@meds_bp.route('', methods=['POST'])
def add_med():
    data = request.json
    db = get_db()
    
    new_med = {
        "user_id": data['user_id'],
        "medication_name": data['medication_name'],
        "dosage": data.get('dosage'),
        "frequency": data['frequency'],
        "reminder_times": data.get('reminder_times', []),
        "is_active": True,
        "created_at": datetime.datetime.utcnow()
    }
    
    result = db.medications.insert_one(new_med)
    new_med['id'] = str(result.inserted_id)
    del new_med['_id']
    
    return jsonify(new_med), 201

@meds_bp.route('/<id>', methods=['DELETE'])
def delete_med(id):
    db = get_db()
    db.medications.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Deleted"}), 200

@meds_bp.route('/<id>', methods=['PUT'])
def update_med(id):
    data = request.json
    db = get_db()
    
    update_fields = {}
    if 'is_active' in data:
        update_fields['is_active'] = data['is_active']
        
    db.medications.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_fields}
    )
    return jsonify({"message": "Updated"}), 200
