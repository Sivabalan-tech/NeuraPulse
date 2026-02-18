"""
Reminder Scheduler Service
Handles scheduling and sending automated email reminders
"""
import os
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import get_db
from services.email_service import EmailService

class ReminderScheduler:
    """Background scheduler for email reminders"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=os.getenv('SCHEDULER_TIMEZONE', 'Asia/Kolkata'))
        self.db = get_db()
        
    def start(self):
        """Start the background scheduler"""
        # Check for upcoming appointments every hour
        self.scheduler.add_job(
            self.check_appointment_reminders,
            CronTrigger(minute=0),  # Run at the top of every hour
            id='appointment_reminders',
            replace_existing=True
        )
        
        # Check for medication reminders every 15 minutes
        self.scheduler.add_job(
            self.check_medication_reminders,
            CronTrigger(minute='*/15'),  # Every 15 minutes
            id='medication_reminders',
            replace_existing=True
        )
        
        # Send daily goal reminders at 8 AM
        self.scheduler.add_job(
            self.send_daily_goal_reminders,
            CronTrigger(hour=8, minute=0),  # 8:00 AM daily
            id='daily_goal_reminders',
            replace_existing=True
        )
        
        self.scheduler.start()
        print("✅ Reminder scheduler started successfully")
    
    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        print("Reminder scheduler stopped")
    
    def check_appointment_reminders(self):
        """Check for appointments that need reminders"""
        try:
            appointments_collection = self.db['appointments']
            users_collection = self.db['users']
            prefs_collection = self.db['email_preferences']
            
            now = datetime.utcnow()
            
            # Find appointments in the next 25 hours that haven't had 24h reminder
            appointments_24h = appointments_collection.find({
                'appointment_date': {
                    '$gte': now,
                    '$lte': now + timedelta(hours=25)
                },
                'status': {'$in': ['scheduled', 'pending']},
                'reminder_sent_24h': {'$ne': True}
            })
            
            for apt in appointments_24h:
                user = users_collection.find_one({'_id': apt['user_id']})
                if not user:
                    continue
                
                # Check if user has email reminders enabled
                prefs = prefs_collection.find_one({'user_id': str(apt['user_id'])})
                if prefs and not prefs.get('appointment_reminders', {}).get('enabled', True):
                    continue
                
                # Send 24-hour reminder
                apt_date = apt['appointment_date']
                EmailService.send_appointment_reminder(
                    user_email=user.get('email', ''),
                    user_name=user.get('name', 'User'),
                    doctor_name=apt.get('doctor_name', 'Doctor'),
                    specialty=apt.get('specialty', 'General'),
                    appointment_date=apt_date.strftime('%B %d, %Y'),
                    appointment_time=apt_date.strftime('%I:%M %p'),
                    hours_until=24
                )
                
                # Mark as sent
                appointments_collection.update_one(
                    {'_id': apt['_id']},
                    {'$set': {'reminder_sent_24h': True, 'last_reminder_at': now}}
                )
                print(f"✅ Sent 24h reminder for appointment {apt['_id']}")
            
            # Find appointments in the next 2 hours that haven't had 1h reminder
            appointments_1h = appointments_collection.find({
                'appointment_date': {
                    '$gte': now,
                    '$lte': now + timedelta(hours=2)
                },
                'status': {'$in': ['scheduled', 'pending']},
                'reminder_sent_1h': {'$ne': True}
            })
            
            for apt in appointments_1h:
                user = users_collection.find_one({'_id': apt['user_id']})
                if not user:
                    continue
                
                prefs = prefs_collection.find_one({'user_id': str(apt['user_id'])})
                if prefs and not prefs.get('appointment_reminders', {}).get('enabled', True):
                    continue
                
                # Send 1-hour reminder
                apt_date = apt['appointment_date']
                EmailService.send_appointment_reminder(
                    user_email=user.get('email', ''),
                    user_name=user.get('name', 'User'),
                    doctor_name=apt.get('doctor_name', 'Doctor'),
                    specialty=apt.get('specialty', 'General'),
                    appointment_date=apt_date.strftime('%B %d, %Y'),
                    appointment_time=apt_date.strftime('%I:%M %p'),
                    hours_until=1
                )
                
                # Mark as sent
                appointments_collection.update_one(
                    {'_id': apt['_id']},
                    {'$set': {'reminder_sent_1h': True, 'last_reminder_at': now}}
                )
                print(f"✅ Sent 1h reminder for appointment {apt['_id']}")
                
        except Exception as e:
            print(f"❌ Error checking appointment reminders: {e}")
    
    def check_medication_reminders(self):
        """Check for medications that need reminders"""
        try:
            medications_collection = self.db['medications']
            users_collection = self.db['users']
            prefs_collection = self.db['email_preferences']
            
            now = datetime.utcnow()
            current_time = now.strftime('%H:%M')
            
            # Find medications with schedules matching current time (within 15 min window)
            medications = medications_collection.find({
                'schedule': {'$exists': True},
                'active': True
            })
            
            for med in medications:
                user = users_collection.find_one({'_id': med['user_id']})
                if not user:
                    continue
                
                # Check if user has medication reminders enabled
                prefs = prefs_collection.find_one({'user_id': str(med['user_id'])})
                if prefs and not prefs.get('medication_reminders', {}).get('enabled', True):
                    continue
                
                # Check if any scheduled time matches current time
                schedule = med.get('schedule', [])
                for scheduled_time in schedule:
                    # Check if we're within 15 minutes of scheduled time
                    if self._is_time_match(scheduled_time, current_time):
                        # Check if we already sent reminder recently (within last hour)
                        last_sent = med.get('last_reminder_sent')
                        if last_sent and (now - last_sent).seconds < 3600:
                            continue
                        
                        # Send medication reminder
                        EmailService.send_medication_reminder(
                            user_email=user.get('email', ''),
                            user_name=user.get('name', 'User'),
                            medication_name=med.get('name', 'Medication'),
                            dosage=med.get('dosage', '1 tablet'),
                            time=scheduled_time
                        )
                        
                        # Update last sent time
                        medications_collection.update_one(
                            {'_id': med['_id']},
                            {
                                '$set': {'last_reminder_sent': now},
                                '$inc': {'reminder_count': 1}
                            }
                        )
                        print(f"✅ Sent medication reminder for {med['name']}")
                        
        except Exception as e:
            print(f"❌ Error checking medication reminders: {e}")
    
    def send_daily_goal_reminders(self):
        """Send daily health goal reminders"""
        try:
            users_collection = self.db['users']
            prefs_collection = self.db['email_preferences']
            
            # Find all users with daily goal reminders enabled
            prefs_list = prefs_collection.find({
                'daily_goal_reminders.enabled': True
            })
            
            for prefs in prefs_list:
                user = users_collection.find_one({'_id': prefs['user_id']})
                if not user:
                    continue
                
                # Send daily goal reminder
                EmailService.send_daily_goal_reminder(
                    user_email=user.get('email', ''),
                    user_name=user.get('name', 'User'),
                    steps_goal=10000,
                    water_goal=8
                )
                print(f"✅ Sent daily goal reminder to {user.get('email')}")
                
        except Exception as e:
            print(f"❌ Error sending daily goal reminders: {e}")
    
    def _is_time_match(self, scheduled_time: str, current_time: str, window_minutes: int = 15) -> bool:
        """Check if current time is within window of scheduled time"""
        try:
            scheduled_hour, scheduled_min = map(int, scheduled_time.split(':'))
            current_hour, current_min = map(int, current_time.split(':'))
            
            scheduled_total_min = scheduled_hour * 60 + scheduled_min
            current_total_min = current_hour * 60 + current_min
            
            diff = abs(scheduled_total_min - current_total_min)
            return diff <= window_minutes
        except:
            return False

# Global scheduler instance
reminder_scheduler = None

def init_scheduler():
    """Initialize and start the reminder scheduler"""
    global reminder_scheduler
    if reminder_scheduler is None:
        reminder_scheduler = ReminderScheduler()
        reminder_scheduler.start()
    return reminder_scheduler

def get_scheduler():
    """Get the scheduler instance"""
    return reminder_scheduler
