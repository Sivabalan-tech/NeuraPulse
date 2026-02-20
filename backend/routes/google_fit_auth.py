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

        # Trigger an immediate background sync so dashboard shows data right away
        import threading
        def _background_sync(uid):
            try:
                from services.google_fit_service import GoogleFitService
                from database import get_db as _get_db
                _db = _get_db()
                _tokens = _db['google_fit_tokens']
                _sensor = _db['sensor_readings']
                _health = _db['health_logs']
                t_data = _tokens.find_one({'user_id': uid})
                if not t_data:
                    return
                svc = GoogleFitService(
                    access_token=t_data['access_token'],
                    refresh_token=t_data.get('refresh_token'),
                    token_expiry=t_data.get('token_expiry')
                )
                from datetime import datetime, timedelta
                end = datetime.now()
                start = end - timedelta(days=7)
                # Steps/Calories
                try:
                    for act in svc.get_activity_data(start, end):
                        rec_at = act['datetime']
                        if act['steps'] > 0:
                            _sensor.update_one(
                                {'user_id': uid, 'type': 'steps', 'recorded_at': rec_at},
                                {'$set': {'value': act['steps'], 'unit': 'steps', 'source': 'google_fit', 'date': act['date'], 'synced_at': datetime.utcnow()}},
                                upsert=True
                            )
                        if act['calories'] > 0:
                            _sensor.update_one(
                                {'user_id': uid, 'type': 'calories', 'recorded_at': rec_at},
                                {'$set': {'value': act['calories'], 'unit': 'kcal', 'source': 'google_fit', 'date': act['date'], 'synced_at': datetime.utcnow()}},
                                upsert=True
                            )
                except Exception as e:
                    print(f"Auto-sync activity error: {e}")
                # Heart rate
                try:
                    for hr in svc.get_heart_rate_data(start, end):
                        _sensor.update_one(
                            {'user_id': uid, 'type': 'heart_rate', 'recorded_at': hr['timestamp']},
                            {'$set': {'value': hr['bpm'], 'unit': 'bpm', 'source': 'google_fit', 'synced_at': datetime.utcnow()}},
                            upsert=True
                        )
                except Exception as e:
                    print(f"Auto-sync heart rate error: {e}")
                _tokens.update_one({'user_id': uid}, {'$set': {'last_sync': datetime.utcnow()}})
                print(f"✅ Auto-sync complete for user {uid}")
            except Exception as e:
                print(f"Auto-sync background error: {e}")

        threading.Thread(target=_background_sync, args=(user_id,), daemon=True).start()

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
