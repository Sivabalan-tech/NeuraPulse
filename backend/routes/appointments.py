from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId
import datetime

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('', methods=['GET'])
def get_appointments():
    user_id = request.args.get('user_id')
    db = get_db()
    
    if user_id:
        appointments = list(db.appointments.find({"user_id": user_id}))
    else:
        # If no user_id provided, return all (for admin)
        # In a real app we'd check current_user.role == 'admin' here
        appointments = list(db.appointments.find({}))
    
    for appt in appointments:
        appt['id'] = str(appt.pop('_id'))
        
    return jsonify(appointments)

@appointments_bp.route('', methods=['POST'])
def create_appointment():
    data = request.json
    db = get_db()
    
    new_appt = {
        "user_id": data['user_id'],
        "doctor_name": data['doctor_name'],
        "specialty": data.get('specialty'),
        "appointment_date": data['appointment_date'],
        "status": "pending", # Default to pending for admin approval
        "notes": data.get('notes'),
        "created_at": datetime.datetime.utcnow()
    }
    
    res = db.appointments.insert_one(new_appt)
    return jsonify({"message": "Created", "id": str(res.inserted_id)}), 201

@appointments_bp.route('/<id>/status', methods=['PUT'])
def update_status(id):
    data = request.json
    status = data.get('status')
    db = get_db()
    
    result = db.appointments.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": status}}
    )
    
    if result.matched_count:
        # Create notification if status changed to approved/rejected
        if status in ['approved', 'rejected']:
            # Fetch appointment to get user_id and doctor_name
            appt = db.appointments.find_one({"_id": ObjectId(id)})
            if appt:
                notification = {
                    "user_id": appt['user_id'],
                    "title": f"Appointment {status.capitalize()}",
                    "message": f"Your appointment with {appt['doctor_name']} has been {status}.",
                    "type": "success" if status == 'approved' else "error",
                    "is_read": False,
                    "created_at": datetime.datetime.utcnow()
                }
                db.notifications.insert_one(notification)
                
        return jsonify({"message": "Status updated"}), 200
    return jsonify({"error": "Appointment not found"}), 404

@appointments_bp.route('/reminder', methods=['POST'])
def send_reminder():
    data = request.json
    appointment_id = data.get('appointment_id')
    
    # In a real application, we would fetch the user's email and send an actual email here.
    # For now, we'll mock the success.
    print(f"Mock: Sending reminder for appointment {appointment_id}")
    
    return jsonify({"message": "Reminder sent successfully"}), 200
