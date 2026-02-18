import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  type: "appointment" | "medication";
  userEmail: string;
  userName?: string;
  appointmentDetails?: {
    doctorName: string;
    specialty?: string;
    date: string;
    time: string;
    reason?: string;
  };
  medicationDetails?: {
    medicationName: string;
    dosage?: string;
    reminderTime: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ReminderEmailRequest = await req.json();
    console.log("Received reminder email request:", requestData);

    const { type, userEmail, userName, appointmentDetails, medicationDetails } = requestData;

    if (!userEmail) {
      throw new Error("User email is required");
    }

    let subject = "";
    let htmlContent = "";

    if (type === "appointment" && appointmentDetails) {
      subject = `Appointment Reminder: ${appointmentDetails.doctorName}`;
      htmlContent = `
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
              .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏥 Appointment Reminder</h1>
              </div>
              <div class="content">
                <p>Hello${userName ? ` ${userName}` : ""},</p>
                <p>This is a friendly reminder about your upcoming appointment:</p>
                <div class="details">
                  <p><span class="label">Doctor:</span> ${appointmentDetails.doctorName}</p>
                  ${appointmentDetails.specialty ? `<p><span class="label">Specialty:</span> ${appointmentDetails.specialty}</p>` : ""}
                  <p><span class="label">Date:</span> ${appointmentDetails.date}</p>
                  <p><span class="label">Time:</span> ${appointmentDetails.time}</p>
                  ${appointmentDetails.reason ? `<p><span class="label">Reason:</span> ${appointmentDetails.reason}</p>` : ""}
                </div>
                <p>Please arrive 10-15 minutes early to complete any necessary paperwork.</p>
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
    } else if (type === "medication" && medicationDetails) {
      subject = `Medication Reminder: ${medicationDetails.medicationName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0891b2, #059669); padding: 30px; border-radius: 12px 12px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
              .details p { margin: 8px 0; }
              .label { font-weight: bold; color: #6b7280; }
              .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💊 Medication Reminder</h1>
              </div>
              <div class="content">
                <p>Hello${userName ? ` ${userName}` : ""},</p>
                <p>It's time to take your medication:</p>
                <div class="details">
                  <p><span class="label">Medication:</span> ${medicationDetails.medicationName}</p>
                  ${medicationDetails.dosage ? `<p><span class="label">Dosage:</span> ${medicationDetails.dosage}</p>` : ""}
                  <p><span class="label">Scheduled Time:</span> ${medicationDetails.reminderTime}</p>
                </div>
                <p>Remember to take your medication with water and follow any specific instructions from your healthcare provider.</p>
                <p>Stay healthy!</p>
                <p><strong>Baymax AI Health Assistant</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated reminder from Baymax AI.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      throw new Error("Invalid reminder type or missing details");
    }

    console.log(`Sending ${type} reminder email to ${userEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Baymax AI <onboarding@resend.dev>",
        to: [userEmail],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const responseData = await emailResponse.json();
    console.log("Email sent successfully:", responseData);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reminder-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
