from flask import Blueprint, jsonify
from database import get_db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
def get_stats():
    db = get_db()
    
    user_count = db.users.count_documents({})
    doctor_count = db.doctors.count_documents({})
    appointment_count = db.appointments.count_documents({})
    
    return jsonify({
        "users": user_count,
        "doctors": doctor_count,
        "appointments": appointment_count
    })

@admin_bp.route('/users', methods=['GET'])
def get_users():
    db = get_db()
    users = list(db.users.find({}, {"password": 0})) # Exclude passwords
    
    result = []
    for user in users:
        user['id'] = str(user.pop('_id'))
        result.append(user)
        
    return jsonify(result)
