import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
// import { supabase } from "@/integrations/supabase/client"; // Removed
// import { User } from "@supabase/supabase-js"; // Removed
// Mock User type
interface User {
  id: string;
  email?: string;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft, Camera, Loader2, Save, User as UserIcon } from "lucide-react";

interface NotificationPreferences {
  appointments: boolean;
  medications: boolean;
  email_notifications: boolean;
}

const ProfileSettings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    appointments: true,
    medications: true,
    email_notifications: true,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      // User is already authenticated if we are here (protected route usually, or Dashboard check)
      // But we need user ID.
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("neurapulse_token");

      if (!userId || !token) {
        navigate("/auth");
        return;
      }

      // Mock user object for compatibility or fetch minimal details if needed
      setUser({
        id: userId,
        app_metadata: {},
        user_metadata: { full_name: "User" },
        aud: "authenticated",
        created_at: ""
      } as any);

      try {
        const profile = await api.get<any>(`/profile?user_id=${userId}`);

        if (profile) {
          setFullName(profile.full_name || "");
          setAvatarUrl(profile.avatar_url);
          // Handle notification preferences
          if (profile.notification_preferences) {
            setNotificationPrefs(profile.notification_preferences);
          }
          // Handle phone number
          if (profile.phone_number) {
            setPhoneNumber(profile.phone_number);
          }
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, [navigate]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const userId = localStorage.getItem("user_id");
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);

      const response = await api.post<{ url: string }>("/profile/avatar", formData);

      setAvatarUrl(response.url);
      toast({
        title: "Avatar Uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    setSaving(true);

    try {
      await api.post("/profile", {
        user_id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
        notification_preferences: notificationPrefs,
        phone_number: phoneNumber,
      });

      toast({
        title: "Settings Saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Heart className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Profile Settings</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                Profile Picture
              </CardTitle>
              <CardDescription>
                Upload a profile picture to personalize your account
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Click the camera icon to upload a new photo.</p>
                <p>Recommended: Square image, at least 200x200 pixels.</p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  type="tel"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="apt-notifications">Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming appointments
                  </p>
                </div>
                <Switch
                  id="apt-notifications"
                  checked={notificationPrefs.appointments}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({ ...prev, appointments: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="med-notifications">Medication Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to take your medications
                  </p>
                </div>
                <Switch
                  id="med-notifications"
                  checked={notificationPrefs.medications}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({ ...prev, medications: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notificationPrefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({ ...prev, email_notifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
