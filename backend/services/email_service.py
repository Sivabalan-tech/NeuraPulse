"""
Email Service using Resend API
Handles sending appointment, medication, and daily goal reminders
"""
import os
import resend
from datetime import datetime
from typing import Dict, Optional

# Initialize Resend with API key
resend.api_key = os.getenv('RESEND_API_KEY')

class EmailService:
    """Service for sending various types of email reminders"""
    
    FROM_EMAIL = "Baymax Healthcare <onboarding@resend.dev>"  # Use your verified domain in production
    
    @staticmethod
    def send_email(to: str, subject: str, html: str) -> bool:
        """
        Send an email using Resend API
        
        Args:
            to: Recipient email address
            subject: Email subject
            html: HTML content of email
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            params = {
                "from": EmailService.FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html
            }
            
            response = resend.Emails.send(params)
            print(f"Email sent successfully to {to}: {response}")
            return True
            
        except Exception as e:
            print(f"Failed to send email to {to}: {e}")
            return False
    
    @staticmethod
    def send_appointment_reminder(
        user_email: str,
        user_name: str,
        doctor_name: str,
        specialty: str,
        appointment_date: str,
        appointment_time: str,
        hours_until: int
    ) -> bool:
        """Send appointment reminder email"""
        
        time_text = f"{hours_until} hours" if hours_until > 1 else "1 hour"
        
        subject = f"Reminder: Appointment with Dr. {doctor_name} in {time_text}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .appointment-card {{ background: white; padding: 20px; border-radius: 8px; 
                                    margin: 20px 0; border-left: 4px solid #667eea; }}
                .detail {{ margin: 10px 0; font-size: 16px; }}
                .icon {{ margin-right: 10px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .button {{ background: #667eea; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block; 
                          margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 Appointment Reminder</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>This is a friendly reminder about your upcoming appointment in <strong>{time_text}</strong>.</p>
                    
                    <div class="appointment-card">
                        <div class="detail">
                            <span class="icon">📅</span>
                            <strong>Date:</strong> {appointment_date}
                        </div>
                        <div class="detail">
                            <span class="icon">🕐</span>
                            <strong>Time:</strong> {appointment_time}
                        </div>
                        <div class="detail">
                            <span class="icon">👨‍⚕️</span>
                            <strong>Doctor:</strong> Dr. {doctor_name}
                        </div>
                        <div class="detail">
                            <span class="icon">🏥</span>
                            <strong>Specialty:</strong> {specialty}
                        </div>
                    </div>
                    
                    <p><strong>Important:</strong> Please arrive 10 minutes early for check-in.</p>
                    <p>If you need to reschedule, please contact us as soon as possible.</p>
                    
                    <div class="footer">
                        <p>Stay healthy! 💙</p>
                        <p><strong>Baymax Healthcare Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(user_email, subject, html)
    
    @staticmethod
    def send_medication_reminder(
        user_email: str,
        user_name: str,
        medication_name: str,
        dosage: str,
        time: str
    ) -> bool:
        """Send medication reminder email"""
        
        subject = f"💊 Time to Take Your Medication: {medication_name}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                           color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .med-card {{ background: white; padding: 20px; border-radius: 8px; 
                            margin: 20px 0; border-left: 4px solid #f5576c; }}
                .detail {{ margin: 10px 0; font-size: 16px; }}
                .icon {{ margin-right: 10px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💊 Medication Reminder</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>It's time to take your medication!</p>
                    
                    <div class="med-card">
                        <div class="detail">
                            <span class="icon">💊</span>
                            <strong>Medication:</strong> {medication_name}
                        </div>
                        <div class="detail">
                            <span class="icon">📏</span>
                            <strong>Dosage:</strong> {dosage}
                        </div>
                        <div class="detail">
                            <span class="icon">⏰</span>
                            <strong>Time:</strong> {time}
                        </div>
                    </div>
                    
                    <p>Don't forget to log it in your Baymax Health dashboard!</p>
                    
                    <div class="footer">
                        <p>Stay consistent with your medication! 💙</p>
                        <p><strong>Baymax Healthcare Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(user_email, subject, html)
    
    @staticmethod
    def send_daily_goal_reminder(
        user_email: str,
        user_name: str,
        steps_goal: int = 10000,
        water_goal: int = 8
    ) -> bool:
        """Send daily health goals reminder"""
        
        subject = "🌅 Good Morning! Your Health Goals for Today"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                           color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .goals {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .goal-item {{ margin: 15px 0; font-size: 18px; }}
                .icon {{ margin-right: 10px; font-size: 24px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌅 Good Morning!</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>Here are your health goals for today. Let's make it a great day!</p>
                    
                    <div class="goals">
                        <div class="goal-item">
                            <span class="icon">🚶</span>
                            <strong>Steps:</strong> {steps_goal:,} steps
                        </div>
                        <div class="goal-item">
                            <span class="icon">💧</span>
                            <strong>Water:</strong> {water_goal} glasses
                        </div>
                        <div class="goal-item">
                            <span class="icon">😴</span>
                            <strong>Sleep:</strong> 8 hours tonight
                        </div>
                        <div class="goal-item">
                            <span class="icon">🥗</span>
                            <strong>Nutrition:</strong> Eat balanced meals
                        </div>
                    </div>
                    
                    <p>Track your progress in the Baymax dashboard throughout the day!</p>
                    
                    <div class="footer">
                        <p>You've got this! 💪</p>
                        <p><strong>Baymax Healthcare Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(user_email, subject, html)
    
    @staticmethod
    def send_test_email(user_email: str, user_name: str) -> bool:
        """Send a test email to verify configuration"""
        
        subject = "✅ Baymax Email Notifications - Test Successful"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); 
                           color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .success {{ background: white; padding: 20px; border-radius: 8px; 
                           margin: 20px 0; text-align: center; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Email Test Successful!</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{user_name}</strong>,</p>
                    
                    <div class="success">
                        <h2 style="color: #43e97b;">🎉 Great News!</h2>
                        <p>Your email notifications are working perfectly.</p>
                        <p>You'll now receive reminders for:</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Upcoming appointments</li>
                            <li>Medication schedules</li>
                            <li>Daily health goals</li>
                        </ul>
                    </div>
                    
                    <p>You can manage your email preferences anytime in your dashboard settings.</p>
                    
                    <div class="footer">
                        <p>Welcome to Baymax Healthcare! 💙</p>
                        <p><strong>Baymax Healthcare Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(user_email, subject, html)
