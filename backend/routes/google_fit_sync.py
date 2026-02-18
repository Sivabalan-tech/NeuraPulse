"""
Google Fit Data Synchronization Routes
"""
from flask import Blueprint, request, jsonify
from database import get_db
from services.google_fit_service import GoogleFitService
from datetime import datetime, timedelta

google_fit_sync_bp = Blueprint('google_fit_sync', __name__)

@google_fit_sync_bp.route('/sync', methods=['POST'])
def sync_google_fit_data():
    """
    Manually trigger sync of Google Fit data
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        days = data.get('days', 7)  # Default to last 7 days
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        tokens_collection = db['google_fit_tokens']
        sensor_readings = db['sensor_readings']
        health_logs = db['health_logs']
        
        # Get user's tokens
        token_data = tokens_collection.find_one({'user_id': user_id})
        if not token_data:
            return jsonify({"error": "Google Fit not connected"}), 400
        
        # Initialize Google Fit service
        fit_service = GoogleFitService(
            access_token=token_data['access_token'],
            refresh_token=token_data.get('refresh_token'),
            token_expiry=token_data.get('token_expiry')
        )
        
        # Refresh token if needed
        updated_credentials = fit_service.refresh_token_if_needed()
        if updated_credentials.token != token_data['access_token']:
            # Update token in database
            tokens_collection.update_one(
                {'user_id': user_id},
                {'$set': {
                    'access_token': updated_credentials.token,
                    'token_expiry': updated_credentials.expiry
                }}
            )
        
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        
        synced_data = {
            'heart_rate': [],
            'sleep': [],
            'activity': [],
            'body': []
        }
        
        # Fetch heart rate data
        heart_rate_data = fit_service.get_heart_rate_data(start_time, end_time)
        for reading in heart_rate_data:
            sensor_readings.update_one(
                {
                    'user_id': user_id,
                    'type': 'heart_rate',
                    'recorded_at': reading['timestamp']
                },
                {
                    '$set': {
                        'value': reading['bpm'],
                        'unit': 'bpm',
                        'source': 'google_fit',
                        'synced_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
        synced_data['heart_rate'] = heart_rate_data
        
        # Fetch sleep data
        sleep_data = fit_service.get_sleep_data(start_time, end_time)
        for sleep_session in sleep_data:
            # Update health log with sleep data
            health_logs.update_one(
                {
                    'user_id': user_id,
                    'date': sleep_session['date']
                },
                {
                    '$set': {
                        'sleep_hours': sleep_session['duration_hours'],
                        'sleep_source': 'google_fit',
                        'sleep_synced_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
        synced_data['sleep'] = sleep_data
        
        # Fetch activity data
        activity_data = fit_service.get_activity_data(start_time, end_time)
        for activity in activity_data:
            # Store steps
            if activity['steps'] > 0:
                sensor_readings.update_one(
                    {
                        'user_id': user_id,
                        'type': 'steps',
                        'recorded_at': datetime.fromisoformat(activity['date'])
                    },
                    {
                        '$set': {
                            'value': activity['steps'],
                            'unit': 'steps',
                            'source': 'google_fit',
                            'synced_at': datetime.utcnow()
                        }
                    },
                    upsert=True
                )
            
            # Store calories
            if activity['calories'] > 0:
                sensor_readings.update_one(
                    {
                        'user_id': user_id,
                        'type': 'calories',
                        'recorded_at': datetime.fromisoformat(activity['date'])
                    },
                    {
                        '$set': {
                            'value': activity['calories'],
                            'unit': 'kcal',
                            'source': 'google_fit',
                            'synced_at': datetime.utcnow()
                        }
                    },
                    upsert=True
                )
        synced_data['activity'] = activity_data
        
        # Fetch body data
        body_data = fit_service.get_body_data(start_time, end_time)
        for measurement in body_data:
            sensor_readings.update_one(
                {
                    'user_id': user_id,
                    'type': 'weight',
                    'recorded_at': measurement['timestamp']
                },
                {
                    '$set': {
                        'value': measurement['weight_kg'],
                        'unit': 'kg',
                        'source': 'google_fit',
                        'synced_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
        synced_data['body'] = body_data
        
        # Update last sync time
        tokens_collection.update_one(
            {'user_id': user_id},
            {'$set': {'last_sync': datetime.utcnow()}}
        )
        
        return jsonify({
            "success": True,
            "message": "Data synced successfully",
            "synced_at": datetime.utcnow().isoformat(),
            "data_summary": {
                'heart_rate_readings': len(synced_data['heart_rate']),
                'sleep_sessions': len(synced_data['sleep']),
                'activity_days': len(synced_data['activity']),
                'body_measurements': len(synced_data['body'])
            },
            "data": synced_data
        })
    
    except Exception as e:
        print(f"Sync error: {e}")
        return jsonify({"error": str(e)}), 500

@google_fit_sync_bp.route('/latest', methods=['GET'])
def get_latest_data():
    """
    Get latest synced data from database
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db = get_db()
        sensor_readings = db['sensor_readings']
        
        # Get latest readings of each type
        latest_data = {}
        
        for data_type in ['heart_rate', 'steps', 'calories', 'weight']:
            latest = sensor_readings.find_one(
                {'user_id': user_id, 'type': data_type, 'source': 'google_fit'},
                sort=[('recorded_at', -1)]
            )
            if latest:
                latest_data[data_type] = {
                    'value': latest['value'],
                    'unit': latest['unit'],
                    'recorded_at': latest['recorded_at'].isoformat(),
                    'synced_at': latest.get('synced_at', '').isoformat() if latest.get('synced_at') else None
                }
        
        return jsonify(latest_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
