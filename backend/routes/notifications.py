from flask import Blueprint, request, jsonify
from database import get_db
from bson.objectid import ObjectId
import datetime

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
def get_notifications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
        
    db = get_db()
    # Fetch notifications for user, sorted by date desc
    notifications = list(db.notifications.find({"user_id": user_id}).sort("created_at", -1))
    
    for note in notifications:
        note['id'] = str(note.pop('_id'))
        
    return jsonify(notifications)

@notifications_bp.route('/<id>/read', methods=['PUT'])
def mark_as_read(id):
    db = get_db()
    result = db.notifications.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count:
        return jsonify({"message": "Marked as read"}), 200
    return jsonify({"error": "Notification not found"}), 404

@notifications_bp.route('/<id>', methods=['DELETE'])
def delete_notification(id):
    db = get_db()
    result = db.notifications.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count:
        return jsonify({"message": "Deleted"}), 200
    return jsonify({"error": "Notification not found"}), 404
