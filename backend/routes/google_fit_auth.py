"""
Google Fit OAuth Authentication Routes
"""
import os
from flask import Blueprint, request, redirect, jsonify, session
from google_auth_oauthlib.flow import Flow
from database import get_db
from datetime import datetime

# Allow HTTP for local development (REMOVE IN PRODUCTION!)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

google_fit_auth_bp = Blueprint('google_fit_auth', __name__)

# OAuth 2.0 configuration
CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_FIT_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_FIT_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [os.getenv("GOOGLE_FIT_REDIRECT_URI", "http://localhost:5000/api/google-fit/callback")]
    }
}

SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.location.read'
]

@google_fit_auth_bp.route('/connect', methods=['GET'])
def connect_google_fit():
    """
    Initiate OAuth 2.0 flow to connect Google Fit
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        # Store user_id in session for callback
        session['user_id'] = user_id
        
        # Create flow instance
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=CLIENT_CONFIG['web']['redirect_uris'][0]
        )
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Force consent to get refresh token
        )
        
        # Store state in session for security
        session['state'] = state
        
        return redirect(authorization_url)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@google_fit_auth_bp.route('/callback', methods=['GET'])
def oauth_callback():
    """
    Handle OAuth callback from Google
    """
    try:
        # Verify state to prevent CSRF
        state = session.get('state')
        if not state or state != request.args.get('state'):
            return jsonify({"error": "Invalid state parameter"}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "No user_id in session"}), 400
        
        # Exchange authorization code for tokens
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            state=state,
            redirect_uri=CLIENT_CONFIG['web']['redirect_uris'][0]
        )
        
        flow.fetch_token(authorization_response=request.url)
        
        credentials = flow.credentials
        
        # Store tokens in database
        db = get_db()
        tokens_collection = db['google_fit_tokens']
        
        token_data = {
            'user_id': user_id,
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_expiry': credentials.expiry,
            'scopes': credentials.scopes,
            'connected_at': datetime.utcnow(),
            'last_sync': None
        }
        
        # Upsert token data
        tokens_collection.update_one(
            {'user_id': user_id},
            {'$set': token_data},
            upsert=True
        )
        
        # Clear session
        session.pop('state', None)
        session.pop('user_id', None)
        
        # Redirect to frontend with success
        return redirect(f'http://localhost:8080/dashboard?google_fit=connected')
    
    except Exception as e:
        print(f"OAuth callback error: {e}")
        return redirect(f'http://localhost:8080/dashboard?google_fit=error&message={str(e)}')

@google_fit_auth_bp.route('/status', methods=['GET'])
def connection_status():
    """
    Check if user has connected Google Fit
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        tokens_collection = db['google_fit_tokens']
        
        token_data = tokens_collection.find_one({'user_id': user_id})
        
        if token_data:
            return jsonify({
                "connected": True,
                "connected_at": token_data.get('connected_at'),
                "last_sync": token_data.get('last_sync'),
                "scopes": token_data.get('scopes', [])
            })
        else:
            return jsonify({"connected": False})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@google_fit_auth_bp.route('/disconnect', methods=['POST'])
def disconnect_google_fit():
    """
    Disconnect Google Fit and revoke access
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        tokens_collection = db['google_fit_tokens']
        
        # Get token to revoke
        token_data = tokens_collection.find_one({'user_id': user_id})
        
        if token_data:
            # Revoke token with Google
            import requests
            access_token = token_data.get('access_token')
            if access_token:
                revoke_url = f'https://oauth2.googleapis.com/revoke?token={access_token}'
                requests.post(revoke_url)
            
            # Delete from database
            tokens_collection.delete_one({'user_id': user_id})
        
        return jsonify({"success": True, "message": "Google Fit disconnected"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
