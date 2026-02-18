import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty: string | null;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  notification_preferences: {
    appointments?: boolean;
    medications?: boolean;
    email_notifications?: boolean;
  } | null;
}

const sendEmail = async (to: string, subject: string, html: string) => {
  console.log(`Sending email to ${to}: ${subject}`);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Baymax AI <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
  
  console.log(`Email sent successfully to ${to}`);
  return true;
};

const generateAppointmentReminderEmail = (
  userName: string | null,
  appointment: Appointment
) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0891b2, #059669); padding: 30px; border-radius: 12px 12px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
          .details p { margin: 8px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .highlight { background: #fef3c7; padding: 12px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Appointment Reminder - Tomorrow!</h1>
          </div>
          <div class="content">
            <p>Hello${userName ? ` ${userName}` : ""},</p>
            <div class="highlight">
              <strong>⏰ You have an appointment tomorrow!</strong>
            </div>
            <div class="details">
              <p><span class="label">Doctor:</span> ${appointment.doctor_name}</p>
              ${appointment.specialty ? `<p><span class="label">Specialty:</span> ${appointment.specialty}</p>` : ""}
              <p><span class="label">Date:</span> ${appointment.appointment_date}</p>
              <p><span class="label">Time:</span> ${appointment.appointment_time}</p>
              ${appointment.reason ? `<p><span class="label">Reason:</span> ${appointment.reason}</p>` : ""}
            </div>
            <p><strong>Tips for your visit:</strong></p>
            <ul>
              <li>Arrive 10-15 minutes early</li>
              <li>Bring your ID and insurance card</li>
              <li>Prepare a list of current medications</li>
              <li>Write down any questions you want to ask</li>
            </ul>
            <p>If you need to reschedule, please contact us as soon as possible.</p>
            <p>Take care!</p>
            <p><strong>Baymax AI Health Assistant</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Baymax AI.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting daily reminder check...");
  
  try {
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    
    console.log(`Checking for appointments on ${tomorrowStr}`);

    // Fetch appointments for tomorrow
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", tomorrowStr)
      .eq("status", "scheduled");

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} appointments for tomorrow`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments for tomorrow", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(appointments.map((a) => a.user_id))];
    
    // Fetch user profiles with email preferences
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, notification_preferences")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Also fetch from auth.users for email addresses
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
    }

    // Create email map
    const emailMap = new Map<string, { email: string; name: string | null }>();
    
    authUsers?.users?.forEach((user) => {
      const profile = profiles?.find((p) => p.id === user.id);
      const prefs = profile?.notification_preferences as Profile["notification_preferences"];
      
      // Check if user has email notifications enabled (default to true if not set)
      const emailEnabled = prefs?.email_notifications !== false && prefs?.appointments !== false;
      
      if (emailEnabled && user.email) {
        emailMap.set(user.id, {
          email: user.email,
          name: profile?.full_name || null,
        });
      }
    });

    console.log(`Found ${emailMap.size} users with email notifications enabled`);

    // Send reminder emails
    let sentCount = 0;
    const errors: string[] = [];

    for (const appointment of appointments) {
      const userInfo = emailMap.get(appointment.user_id);
      
      if (!userInfo) {
        console.log(`Skipping appointment ${appointment.id}: no email or notifications disabled`);
        continue;
      }

      const html = generateAppointmentReminderEmail(userInfo.name, appointment);
      const subject = `Reminder: Appointment with ${appointment.doctor_name} Tomorrow`;
      
      const success = await sendEmail(userInfo.email, subject, html);
      
      if (success) {
        sentCount++;
      } else {
        errors.push(`Failed to send to ${userInfo.email}`);
      }
    }

    console.log(`Daily reminder check complete. Sent ${sentCount} emails.`);

    return new Response(
      JSON.stringify({
        message: "Daily reminder check complete",
        appointmentsFound: appointments.length,
        emailsSent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in daily-reminder-check:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
