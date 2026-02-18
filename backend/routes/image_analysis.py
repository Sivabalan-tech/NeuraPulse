from flask import Blueprint, request, jsonify
import os
import base64
from datetime import datetime
from werkzeug.utils import secure_filename
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

image_analysis_bp = Blueprint('image_analysis', __name__)

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_image_size(file_stream):
    """Validate image file size"""
    file_stream.seek(0, os.SEEK_END)
    size = file_stream.tell()
    file_stream.seek(0)
    return size <= MAX_FILE_SIZE

@image_analysis_bp.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Analyze medical images (rashes, wounds, etc.) using Gemini Vision
    Expects: multipart/form-data with 'image' file and optional 'description' text
    """
    if not GENAI_API_KEY:
        return jsonify({"error": "Gemini API not configured"}), 500
    
    # Check if image is in request
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    description = request.form.get('description', '')
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    try:
        # Validate file size
        if not validate_image_size(file.stream):
            return jsonify({"error": f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"}), 400
        
        # Read image data
        image_data = file.read()
        
        # Open image with PIL for validation
        try:
            img = Image.open(io.BytesIO(image_data))
            img.verify()  # Verify it's a valid image
            img = Image.open(io.BytesIO(image_data))  # Reopen after verify
        except Exception as e:
            return jsonify({"error": f"Invalid or corrupted image: {str(e)}"}), 400
        
        # Save image to static folder for reference
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, unique_filename)
        img.save(filepath)
        
        # Use Gemini Vision for analysis
        # Using the same model as chat.py which supports vision
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        # Create detailed medical analysis prompt
        prompt = f"""You are Baymax, a medical AI assistant. Analyze this medical image carefully.

User's description: {description if description else "No description provided"}

Please provide:
1. **Visual Observation**: Describe what you see in the image (color, size, location, texture, etc.)
2. **Possible Conditions**: List potential medical conditions this could indicate (most likely first)
3. **Severity Assessment**: Rate severity (Mild/Moderate/Severe) and explain why
4. **Recommended Actions**: 
   - Home care suggestions (if mild)
   - When to see a doctor (specific warning signs)
   - What type of specialist to consult if needed
5. **Important Disclaimers**: Remind that this is not a diagnosis

CRITICAL: Be compassionate, clear, and emphasize seeing a healthcare professional for proper diagnosis.
Format your response with clear sections using markdown headers and bullet points.
"""
        
        # Generate response with image
        response = model.generate_content([prompt, img])
        
        analysis_result = {
            "analysis": response.text,
            "image_url": f"/static/uploads/{unique_filename}",
            "timestamp": datetime.now().isoformat(),
            "description": description
        }
        
        return jsonify(analysis_result), 200
        
    except Exception as e:
        print(f"Image analysis error: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@image_analysis_bp.route('/upload-base64', methods=['POST'])
def analyze_base64_image():
    """
    Alternative endpoint for base64 encoded images (useful for mobile/web cameras)
    Expects JSON: {"image": "base64_string", "description": "optional text"}
    """
    if not GENAI_API_KEY:
        return jsonify({"error": "Gemini API not configured"}), 500
    
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400
    
    try:
        # Decode base64 image
        image_data = data['image']
        if ',' in image_data:
            # Remove data URL prefix if present (data:image/png;base64,...)
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        description = data.get('description', '')
        
        # Validate image
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))
        
        # Save image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_upload.png"
        
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, filename)
        img.save(filepath)
        
        # Analyze with Gemini
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        prompt = f"""You are Baymax, a medical AI assistant. Analyze this medical image carefully.

User's description: {description if description else "No description provided"}

Please provide:
1. **Visual Observation**: Describe what you see in the image
2. **Possible Conditions**: List potential medical conditions
3. **Severity Assessment**: Rate severity and explain
4. **Recommended Actions**: Home care and when to see a doctor
5. **Important Disclaimers**: This is not a diagnosis

Be compassionate and clear. Format with markdown.
"""
        
        response = model.generate_content([prompt, img])
        
        analysis_result = {
            "analysis": response.text,
            "image_url": f"/static/uploads/{filename}",
            "timestamp": datetime.now().isoformat(),
            "description": description
        }
        
        return jsonify(analysis_result), 200
        
    except Exception as e:
        print(f"Base64 image analysis error: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500
