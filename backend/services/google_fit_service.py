"""
Google Fit Service - Handles API interactions with Google Fit
"""
import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class GoogleFitService:
    """Service for interacting with Google Fit API"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.location.read'
    ]
    
    def __init__(self, access_token, refresh_token=None, token_expiry=None):
        """Initialize with OAuth tokens"""
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv('GOOGLE_FIT_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_FIT_CLIENT_SECRET'),
            scopes=self.SCOPES
        )
        
        if token_expiry:
            self.credentials.expiry = token_expiry
    
    def get_fitness_service(self):
        """Build and return Google Fit API service"""
        return build('fitness', 'v1', credentials=self.credentials)
    
    def get_heart_rate_data(self, start_time=None, end_time=None):
        """
        Fetch heart rate data from Google Fit
        
        Args:
            start_time: datetime object (default: 24 hours ago)
            end_time: datetime object (default: now)
        
        Returns:
            List of heart rate readings with timestamps
        """
        if not start_time:
            start_time = datetime.now() - timedelta(days=1)
        if not end_time:
            end_time = datetime.now()
        
        start_nanos = int(start_time.timestamp() * 1e9)
        end_nanos = int(end_time.timestamp() * 1e9)
        
        try:
            service = self.get_fitness_service()
            
            dataset_id = f"{start_nanos}-{end_nanos}"
            data_source = "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm"
            
            response = service.users().dataSources().datasets().get(
                userId='me',
                dataSourceId=data_source,
                datasetId=dataset_id
            ).execute()
            
            heart_rate_data = []
            for point in response.get('point', []):
                timestamp = datetime.fromtimestamp(int(point['startTimeNanos']) / 1e9)
                bpm = point['value'][0]['fpVal']
                
                heart_rate_data.append({
                    'timestamp': timestamp,
                    'bpm': round(bpm, 1),
                    'source': 'google_fit'
                })
            
            return heart_rate_data
        
        except HttpError as e:
            print(f"Error fetching heart rate data: {e}")
            return []
    
    def get_sleep_data(self, start_time=None, end_time=None):
        """
        Fetch sleep data from Google Fit
        
        Returns:
            List of sleep sessions with duration and quality
        """
        if not start_time:
            start_time = datetime.now() - timedelta(days=7)
        if not end_time:
            end_time = datetime.now()
        
        start_millis = int(start_time.timestamp() * 1000)
        end_millis = int(end_time.timestamp() * 1000)
        
        try:
            service = self.get_fitness_service()
            
            response = service.users().sessions().list(
                userId='me',
                startTime=start_time.isoformat() + 'Z',
                endTime=end_time.isoformat() + 'Z',
                activityType=72  # Sleep activity type
            ).execute()
            
            sleep_data = []
            for session in response.get('session', []):
                start = datetime.fromtimestamp(int(session['startTimeMillis']) / 1000)
                end = datetime.fromtimestamp(int(session['endTimeMillis']) / 1000)
                duration_hours = (end - start).total_seconds() / 3600
                
                sleep_data.append({
                    'date': start.date().isoformat(),
                    'start_time': start,
                    'end_time': end,
                    'duration_hours': round(duration_hours, 2),
                    'source': 'google_fit'
                })
            
            return sleep_data
        
        except HttpError as e:
            print(f"Error fetching sleep data: {e}")
            return []
    
    def get_activity_data(self, start_time=None, end_time=None):
        """
        Fetch activity data (steps, calories, distance)
        
        Returns:
            Dictionary with steps, calories, and distance
        """
        if not start_time:
            start_time = datetime.now() - timedelta(days=1)
        if not end_time:
            end_time = datetime.now()
        
        start_nanos = int(start_time.timestamp() * 1e9)
        end_nanos = int(end_time.timestamp() * 1e9)
        
        try:
            service = self.get_fitness_service()
            
            # Aggregate data request
            body = {
                "aggregateBy": [
                    {"dataTypeName": "com.google.step_count.delta"},
                    {"dataTypeName": "com.google.calories.expended"},
                    {"dataTypeName": "com.google.distance.delta"}
                ],
                "bucketByTime": {"durationMillis": 86400000},  # 1 day buckets
                "startTimeMillis": int(start_time.timestamp() * 1000),
                "endTimeMillis": int(end_time.timestamp() * 1000)
            }
            
            response = service.users().dataset().aggregate(
                userId='me',
                body=body
            ).execute()
            
            activity_data = []
            for bucket in response.get('bucket', []):
                date = datetime.fromtimestamp(int(bucket['startTimeMillis']) / 1000).date()
                
                steps = 0
                calories = 0
                distance = 0
                
                for dataset in bucket.get('dataset', []):
                    data_type = dataset.get('dataSourceId', '')
                    
                    for point in dataset.get('point', []):
                        if 'step_count' in data_type:
                            steps += point['value'][0].get('intVal', 0)
                        elif 'calories' in data_type:
                            calories += point['value'][0].get('fpVal', 0)
                        elif 'distance' in data_type:
                            distance += point['value'][0].get('fpVal', 0)
                
                activity_data.append({
                    'date': date.isoformat(),
                    'steps': steps,
                    'calories': round(calories, 1),
                    'distance_meters': round(distance, 1),
                    'source': 'google_fit'
                })
            
            return activity_data
        
        except HttpError as e:
            print(f"Error fetching activity data: {e}")
            return []
    
    def get_body_data(self, start_time=None, end_time=None):
        """
        Fetch body measurements (weight, height)
        
        Returns:
            List of body measurements
        """
        if not start_time:
            start_time = datetime.now() - timedelta(days=30)
        if not end_time:
            end_time = datetime.now()
        
        start_nanos = int(start_time.timestamp() * 1e9)
        end_nanos = int(end_time.timestamp() * 1e9)
        
        try:
            service = self.get_fitness_service()
            
            dataset_id = f"{start_nanos}-{end_nanos}"
            weight_source = "derived:com.google.weight:com.google.android.gms:merge_weight"
            
            response = service.users().dataSources().datasets().get(
                userId='me',
                dataSourceId=weight_source,
                datasetId=dataset_id
            ).execute()
            
            body_data = []
            for point in response.get('point', []):
                timestamp = datetime.fromtimestamp(int(point['startTimeNanos']) / 1e9)
                weight_kg = point['value'][0]['fpVal']
                
                body_data.append({
                    'timestamp': timestamp,
                    'weight_kg': round(weight_kg, 2),
                    'source': 'google_fit'
                })
            
            return body_data
        
        except HttpError as e:
            print(f"Error fetching body data: {e}")
            return []
    
    def refresh_token_if_needed(self):
        """
        Check if token needs refresh and refresh if necessary
        
        Returns:
            Updated credentials object
        """
        if self.credentials.expired and self.credentials.refresh_token:
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
        
        return self.credentials
