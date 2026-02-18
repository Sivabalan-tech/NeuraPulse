from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('', methods=['GET'])
def get_doctors():
    db = get_db()
    doctors = list(db.doctors.find())
    for doc in doctors:
        doc['id'] = str(doc.pop('_id'))
    return jsonify(doctors)

@doctors_bp.route('', methods=['POST'])
def add_doctor():
    data = request.json
    db = get_db()
    
    new_doctor = {
        "name": data['name'],
        "specialty": data['specialty'],
        "availability": data.get('availability', "9:00 AM - 5:00 PM"),
        "image_url": data.get('image_url', "")
    }
    
    res = db.doctors.insert_one(new_doctor)
    return jsonify({"message": "Doctor added", "id": str(res.inserted_id)}), 201

@doctors_bp.route('/<id>', methods=['DELETE'])
def delete_doctor(id):
    db = get_db()
    result = db.doctors.delete_one({"_id": ObjectId(id)})
    if result.deleted_count:
        return jsonify({"message": "Doctor deleted"}), 200
    return jsonify({"error": "Doctor not found"}), 404
