"""
Google Fit Data Synchronization Routes
"""
from flask import Blueprint, request, jsonify
from database import get_db
from services.google_fit_service import GoogleFitService
from datetime import datetime, timedelta

google_fit_sync_bp = Blueprint('google_fit_sync', __name__)


def _get_fit_service(user_id, db):
    """Helper to get GoogleFitService for a user, returns (service, error_response, tokens)"""
    tokens_collection = db['google_fit_tokens']
    token_data = tokens_collection.find_one({'user_id': user_id})
    if not token_data:
        return None, jsonify({"error": "Google Fit not connected. Please connect first."}), 400, None

    fit_service = GoogleFitService(
        access_token=token_data['access_token'],
        refresh_token=token_data.get('refresh_token'),
        token_expiry=token_data.get('token_expiry')
    )

    # Refresh token if expired and update DB
    updated_credentials = fit_service.refresh_token_if_needed()
    if updated_credentials.token and updated_credentials.token != token_data['access_token']:
        tokens_collection.update_one(
            {'user_id': user_id},
            {'$set': {
                'access_token': updated_credentials.token,
                'token_expiry': updated_credentials.expiry
            }}
        )

    return fit_service, None, None, token_data


@google_fit_sync_bp.route('/sync', methods=['POST'])
def sync_google_fit_data():
    """
    Manually trigger sync of Google Fit data.
    Returns per-type status including errors.
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        days = data.get('days', 7)

        if not user_id:
            return jsonify({"error": "user_id required"}), 400

        db = get_db()
        fit_service, err_resp, err_code, token_data = _get_fit_service(user_id, db)
        if err_resp:
            return err_resp, err_code

        tokens_collection = db['google_fit_tokens']
        sensor_readings = db['sensor_readings']
        health_logs = db['health_logs']

        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)

        synced_data = {'heart_rate': [], 'sleep': [], 'activity': [], 'body': []}
        errors = {}

        # --- Heart Rate ---
        try:
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
        except Exception as e:
            errors['heart_rate'] = str(e)

        # --- Sleep ---
        try:
            sleep_data = fit_service.get_sleep_data(start_time, end_time)
            for sleep_session in sleep_data:
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
        except Exception as e:
            errors['sleep'] = str(e)

        # --- Activity (Steps, Calories) ---
        try:
            activity_data = fit_service.get_activity_data(start_time, end_time)
            for activity in activity_data:
                # Use the proper datetime object for the recorded_at key (not a date string)
                recorded_at = activity['datetime']

                if activity['steps'] > 0:
                    sensor_readings.update_one(
                        {
                            'user_id': user_id,
                            'type': 'steps',
                            'recorded_at': recorded_at
                        },
                        {
                            '$set': {
                                'value': activity['steps'],
                                'unit': 'steps',
                                'source': 'google_fit',
                                'date': activity['date'],
                                'synced_at': datetime.utcnow()
                            }
                        },
                        upsert=True
                    )

                if activity['calories'] > 0:
                    sensor_readings.update_one(
                        {
                            'user_id': user_id,
                            'type': 'calories',
                            'recorded_at': recorded_at
                        },
                        {
                            '$set': {
                                'value': activity['calories'],
                                'unit': 'kcal',
                                'source': 'google_fit',
                                'date': activity['date'],
                                'synced_at': datetime.utcnow()
                            }
                        },
                        upsert=True
                    )
            synced_data['activity'] = activity_data
        except Exception as e:
            errors['activity'] = str(e)

        # --- Body (Weight) ---
        try:
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
        except Exception as e:
            errors['body'] = str(e)

        # Update last sync time
        tokens_collection.update_one(
            {'user_id': user_id},
            {'$set': {'last_sync': datetime.utcnow()}}
        )

        return jsonify({
            "success": len(errors) == 0,
            "message": "Sync completed" + (f" with {len(errors)} error(s)" if errors else " successfully"),
            "synced_at": datetime.utcnow().isoformat(),
            "data_summary": {
                'heart_rate_readings': len(synced_data['heart_rate']),
                'sleep_sessions': len(synced_data['sleep']),
                'activity_days': len(synced_data['activity']),
                'body_measurements': len(synced_data['body'])
            },
            "errors": errors
        })

    except Exception as e:
        print(f"Sync error: {e}")
        return jsonify({"error": str(e)}), 500


@google_fit_sync_bp.route('/sync-and-fetch', methods=['POST'])
def sync_and_fetch():
    """
    Sync Google Fit data AND return the latest data in one call.
    More efficient for frontend use.
    """
    # First do a sync
    sync_result = sync_google_fit_data()
    # sync_result is a Response object; check status
    if hasattr(sync_result, 'status_code') and sync_result.status_code >= 400:
        return sync_result

    # Then fetch latest from DB
    user_id = request.json.get('user_id') if request.json else None
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    latest = _fetch_latest(user_id)
    return jsonify({
        "sync": sync_result.get_json() if hasattr(sync_result, 'get_json') else {},
        "latest": latest
    })


@google_fit_sync_bp.route('/latest', methods=['GET'])
def get_latest_data():
    """
    Get latest synced data from database for all metric types.
    Also returns the last_sync timestamp.
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400

        latest_data = _fetch_latest(user_id)

        # Also include last_sync time from tokens
        db = get_db()
        token_data = db['google_fit_tokens'].find_one({'user_id': user_id})
        if token_data:
            last_sync = token_data.get('last_sync')
            latest_data['last_sync'] = last_sync.isoformat() if last_sync else None

        return jsonify(latest_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@google_fit_sync_bp.route('/history', methods=['GET'])
def get_historical_data():
    """
    Get historical sensor data from database for a date range.
    Params: user_id, days (default 30)
    """
    try:
        user_id = request.args.get('user_id')
        days = int(request.args.get('days', 30))

        if not user_id:
            return jsonify({"error": "user_id required"}), 400

        history = _fetch_history(user_id, days)
        return jsonify(history)

    except Exception as e:
        print(f"History fetch error: {e}")
        return jsonify({"error": str(e)}), 500


def _fetch_latest(user_id):
    """Internal helper: fetch latest readings from DB."""
    db = get_db()
    sensor_readings = db['sensor_readings']

    latest_data = {}
    for data_type in ['heart_rate', 'steps', 'calories', 'weight']:
        latest = sensor_readings.find_one(
            {'user_id': user_id, 'type': data_type, 'source': 'google_fit'},
            sort=[('recorded_at', -1)]
        )
        if latest:
            synced_at = latest.get('synced_at')
            recorded_at = latest.get('recorded_at')
            latest_data[data_type] = {
                'value': latest['value'],
                'unit': latest['unit'],
                'recorded_at': recorded_at.isoformat() if recorded_at else None,
                'synced_at': synced_at.isoformat() if synced_at else None,
                'date': latest.get('date', '')
            }

    return latest_data


def _fetch_history(user_id, days):
    """Internal helper: fetch historical readings from DB for last n days."""
    db = get_db()
    sensor_readings = db['sensor_readings']

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    history_data = {}
    for data_type in ['heart_rate', 'steps', 'calories', 'weight']:
        cursor = sensor_readings.find({
            'user_id': user_id,
            'type': data_type,
            'source': 'google_fit',
            'recorded_at': {'$gte': start_time}
        }).sort('recorded_at', 1)

        history_data[data_type] = []
        for doc in cursor:
            recorded_at = doc.get('recorded_at')
            history_data[data_type].append({
                'value': doc['value'],
                'unit': doc['unit'],
                'recorded_at': recorded_at.isoformat() if recorded_at else None,
                'date': doc.get('date', '')
            })

    return history_data
