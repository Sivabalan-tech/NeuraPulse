from flask import Blueprint, request, jsonify
from database import get_db
import jwt
import datetime
import bcrypt
import os

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key")

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    db = get_db()
    users = db.users
    
    if users.find_one({"email": data['email']}):
        return jsonify({"error": "User already exists"}), 400
        
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    
    user_id = users.insert_one({
        "email": data['email'],
        "password": hashed_password,
        "full_name": data.get('full_name', ''),
        "role": data.get('role', 'user'),  # Default to user, allow admin
        "created_at": datetime.datetime.utcnow()
    }).inserted_id
    
    return jsonify({"message": "User created", "userId": str(user_id)}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    db = get_db()
    user = db.users.find_one({"email": data['email']})
    
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        token = jwt.encode({
            "user_id": str(user['_id']),
            "role": user.get('role', 'user'),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({
            "token": token,
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "full_name": user.get('full_name'),
                "role": user.get('role', 'user')
            }
        })
    
    return jsonify({"error": "Invalid credentials"}), 401
