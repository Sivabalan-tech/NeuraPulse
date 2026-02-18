import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import get_db
from routes.auth import auth_bp
from routes.medications import meds_bp
from routes.health import health_bp
from routes.appointments import appointments_bp
from routes.sensors import sensors_bp
from routes.chat import chat_bp
from routes.profile import profile_bp

from routes.admin import admin_bp
from routes.doctors import doctors_bp
from routes.image_analysis import image_analysis_bp
from routes.google_fit_auth import google_fit_auth_bp
from routes.google_fit_sync import google_fit_sync_bp

app = Flask(__name__)
CORS(app) # Enable CORS for React frontend

# Configure session for OAuth
app.secret_key = os.getenv('SECRET_KEY', 'neurapulse-secret-key-change-in-production')
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Ensure static folder for uploads
os.makedirs(os.path.join(app.root_path, 'static', 'avatars'), exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'static', 'uploads'), exist_ok=True)

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(meds_bp, url_prefix='/api/medications')
app.register_blueprint(health_bp, url_prefix='/api/health-logs')
app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
app.register_blueprint(sensors_bp, url_prefix='/api/sensor-readings')
app.register_blueprint(chat_bp, url_prefix='/api/chat')
app.register_blueprint(profile_bp, url_prefix='/api/profile')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(doctors_bp, url_prefix='/api/doctors')
from routes.notifications import notifications_bp
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(image_analysis_bp, url_prefix='/api/image-analysis')
app.register_blueprint(google_fit_auth_bp, url_prefix='/api/google-fit')
app.register_blueprint(google_fit_sync_bp, url_prefix='/api/google-fit')
from routes.email_routes import email_routes_bp
app.register_blueprint(email_routes_bp, url_prefix='/api/email')

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "NeuraPulse Backend API is running. Access endpoints at /api/..."})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "NeuraPulse Backend"})

if __name__ == '__main__':
    from rag_utils import initialize_rag
    from services.reminder_scheduler import init_scheduler
    
    print("Initializing RAG Vector Store...")
    initialize_rag()
    
    print("Starting Email Reminder Scheduler...")
    init_scheduler()
    
    app.run(debug=True, port=5000)

