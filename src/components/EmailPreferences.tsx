import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Bell, Calendar, Pill, Target, Send } from "lucide-react";

interface EmailPreferencesProps {
    userId: string;
}

const EmailPreferences: React.FC<EmailPreferencesProps> = ({ userId }) => {
    const [preferences, setPreferences] = useState({
        notifications_enabled: true,
        appointment_reminders: { enabled: true },
        medication_reminders: { enabled: true },
        daily_goal_reminders: { enabled: true }
    });
    const [loading, setLoading] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchPreferences();
    }, [userId]);

    const fetchPreferences = async () => {
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/email/preferences?user_id=${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            }
        } catch (error) {
            console.error("Failed to load preferences:", error);
        }
    };

    const savePreferences = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch("http://localhost:5000/api/email/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId, ...preferences })
            });

            if (response.ok) {
                toast({
                    title: "Preferences Saved",
                    description: "Your email notification preferences have been updated.",
                });
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save preferences. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const sendTestEmail = async () => {
        setTestingEmail(true);
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch("http://localhost:5000/api/email/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (response.ok) {
                toast({
                    title: "Test Email Sent! ✅",
                    description: "Check your inbox for the test email.",
                });
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send test email.",
                variant: "destructive"
            });
        } finally {
            setTestingEmail(false);
        }
    };


    const updatePreference = (key: string, value: any) => {
        if (typeof value === 'boolean') {
            setPreferences(prev => ({ ...prev, [key]: value }));
        } else {
            // For nested object updates (appointment_reminders, medication_reminders, etc.)
            setPreferences(prev => {
                const prevValue = prev[key as keyof typeof prev];
                const newValue = typeof prevValue === 'object' && prevValue !== null
                    ? { ...(prevValue as Record<string, any>), ...value }
                    : value;
                return { ...prev, [key]: newValue };
            });
        }
    };


    return (
        <div className="space-y-6">
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Email Notifications
                    </CardTitle>
                    <CardDescription>
                        Manage your email reminder preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-primary" />
                            <div>
                                <Label className="text-base font-medium">Enable All Notifications</Label>
                                <p className="text-sm text-muted-foreground">Master switch for all email reminders</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.notifications_enabled}
                            onCheckedChange={(checked) => updatePreference('notifications_enabled', checked)}
                        />
                    </div>

                    {/* Individual Toggles */}
                    <div className="space-y-4">
                        {/* Appointment Reminders */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <div>
                                    <Label className="text-base">Appointment Reminders</Label>
                                    <p className="text-sm text-muted-foreground">24h and 1h before appointments</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.appointment_reminders.enabled}
                                onCheckedChange={(checked) =>
                                    updatePreference('appointment_reminders', { enabled: checked })
                                }
                                disabled={!preferences.notifications_enabled}
                            />
                        </div>

                        {/* Medication Reminders */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Pill className="w-5 h-5 text-pink-500" />
                                <div>
                                    <Label className="text-base">Medication Reminders</Label>
                                    <p className="text-sm text-muted-foreground">At scheduled medication times</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.medication_reminders.enabled}
                                onCheckedChange={(checked) =>
                                    updatePreference('medication_reminders', { enabled: checked })
                                }
                                disabled={!preferences.notifications_enabled}
                            />
                        </div>

                        {/* Daily Goal Reminders */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-green-500" />
                                <div>
                                    <Label className="text-base">Daily Goal Reminders</Label>
                                    <p className="text-sm text-muted-foreground">Morning reminders for daily health goals</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.daily_goal_reminders.enabled}
                                onCheckedChange={(checked) =>
                                    updatePreference('daily_goal_reminders', { enabled: checked })
                                }
                                disabled={!preferences.notifications_enabled}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={savePreferences}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? "Saving..." : "Save Preferences"}
                        </Button>
                        <Button
                            onClick={sendTestEmail}
                            disabled={testingEmail || !preferences.notifications_enabled}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {testingEmail ? "Sending..." : "Send Test Email"}
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        💡 Tip: Send a test email to verify your email notifications are working correctly
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmailPreferences;
