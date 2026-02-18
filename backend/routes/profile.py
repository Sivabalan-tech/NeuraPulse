from flask import Blueprint, request, jsonify, url_for, current_app
from database import get_db
from werkzeug.utils import secure_filename
import os
import datetime

profile_bp = Blueprint('profile', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route('', methods=['GET'])
def get_profile():
    user_id = request.args.get('user_id')
    db = get_db()
    profile = db.profiles.find_one({"user_id": user_id})
    
    if profile:
        profile['_id'] = str(profile['_id'])
        return jsonify(profile)
    else:
        # Return empty profile or 404? 
        # Frontend logic expects a profile or creation on auth.
        # Let's return a default structure if not found
        return jsonify({
            "user_id": user_id,
            "full_name": "",
            "avatar_url": "",
            "notification_preferences": {
                "appointments": True,
                "medications": True,
                "email_notifications": True
            },
            "phone_number": ""
        })

@profile_bp.route('', methods=['POST', 'PUT'])
def update_profile():
    data = request.json
    user_id = request.args.get('user_id') # Or from data
    if not user_id and 'user_id' in data:
        user_id = data['user_id']
        
    db = get_db()
    
    update_data = {
        "full_name": data.get('full_name'),
        "avatar_url": data.get('avatar_url'),
        "notification_preferences": data.get('notification_preferences'),
        "phone_number": data.get('phone_number'),
        "updated_at": datetime.datetime.utcnow()
    }
    
    db.profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return jsonify({"message": "Profile updated"})

@profile_bp.route('/avatar', methods=['POST'])
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    user_id = request.form.get('user_id')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Ensure uploads directory exists
        upload_folder = os.path.join(current_app.root_path, 'static', 'avatars', user_id)
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Generate URL
        avatar_url = f"http://localhost:5000/static/avatars/{user_id}/{filename}"
        
        return jsonify({"url": avatar_url})
        
    return jsonify({"error": "File type not allowed"}), 400
