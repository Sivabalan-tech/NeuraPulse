"""
Email Preferences Routes
Manage user email notification settings
"""
from flask import Blueprint, request, jsonify
from database import get_db
from services.email_service import EmailService
from datetime import datetime

email_routes_bp = Blueprint('email_routes', __name__)

@email_routes_bp.route('/preferences', methods=['GET'])
def get_email_preferences():
    """Get user's email notification preferences"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        prefs_collection = db['email_preferences']
        
        prefs = prefs_collection.find_one({'user_id': user_id})
        
        if not prefs:
            # Return default preferences
            return jsonify({
                "user_id": user_id,
                "notifications_enabled": True,
                "appointment_reminders": {
                    "enabled": True,
                    "advance_hours": [24, 1]
                },
                "medication_reminders": {
                    "enabled": True
                },
                "daily_goal_reminders": {
                    "enabled": True,
                    "time": "08:00"
                }
            })
        
        # Remove MongoDB _id from response
        prefs.pop('_id', None)
        return jsonify(prefs)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@email_routes_bp.route('/preferences', methods=['POST'])
def update_email_preferences():
    """Update user's email notification preferences"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        prefs_collection = db['email_preferences']
        users_collection = db['users']
        
        # Get user email
        user = users_collection.find_one({'_id': user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Prepare preferences document
        prefs_data = {
            'user_id': user_id,
            'email': user.get('email', ''),
            'notifications_enabled': data.get('notifications_enabled', True),
            'appointment_reminders': data.get('appointment_reminders', {
                'enabled': True,
                'advance_hours': [24, 1]
            }),
            'medication_reminders': data.get('medication_reminders', {
                'enabled': True
            }),
            'daily_goal_reminders': data.get('daily_goal_reminders', {
                'enabled': True,
                'time': '08:00'
            }),
            'updated_at': datetime.utcnow()
        }
        
        # Upsert preferences
        prefs_collection.update_one(
            {'user_id': user_id},
            {'$set': prefs_data, '$setOnInsert': {'created_at': datetime.utcnow()}},
            upsert=True
        )
        
        return jsonify({"success": True, "message": "Preferences updated"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@email_routes_bp.route('/test', methods=['POST'])
def send_test_email():
    """Send a test email to verify configuration"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        users_collection = db['users']
        
        user = users_collection.find_one({'_id': user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        email = user.get('email')
        if not email:
            return jsonify({"error": "User has no email address"}), 400
        
        # Send test email
        success = EmailService.send_test_email(
            user_email=email,
            user_name=user.get('name', 'User')
        )
        
        if success:
            return jsonify({"success": True, "message": f"Test email sent to {email}"})
        else:
            return jsonify({"error": "Failed to send test email"}), 500
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@email_routes_bp.route('/unsubscribe', methods=['POST'])
def unsubscribe():
    """Unsubscribe from all email notifications"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        prefs_collection = db['email_preferences']
        
        # Disable all notifications
        prefs_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    'notifications_enabled': False,
                    'appointment_reminders.enabled': False,
                    'medication_reminders.enabled': False,
                    'daily_goal_reminders.enabled': False,
                    'updated_at': datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return jsonify({"success": True, "message": "Unsubscribed from all email notifications"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
