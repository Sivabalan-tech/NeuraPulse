import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
// import { User } from "@supabase/supabase-js"; // Removed
// Define a local minimal User type
interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, LogOut, MessageSquare, ClipboardList, CalendarCheck, Activity, Settings, Pill, Watch, Camera } from "lucide-react";
import AIChatInterface from "@/components/AIChatInterface";
import HealthLogForm from "@/components/HealthLogForm";
import AppointmentBooking from "@/components/AppointmentBooking";
import HealthDashboard from "@/components/HealthDashboard";
import NotificationCenter from "@/components/NotificationCenter";
import MedicationTracking from "@/components/MedicationTracking";
import ImageAnalysis from "@/components/ImageAnalysis";
import GoogleFitConnect from "@/components/GoogleFitConnect";
import WearableDataDashboard from "@/components/WearableDataDashboard";
import EmailPreferences from "@/components/EmailPreferences";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("neurapulse_token");
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
      navigate("/auth");
    } else {
      // Mock user object for compatibility
      setUser({
        id: userId,
        // app_metadata: {}, // Removed
        user_metadata: { full_name: "User" },
        // aud: "authenticated", // Removed
        // created_at: "" // Removed
      });
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = async () => {
    api.clearToken();
    localStorage.removeItem("user_id");
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    navigate("/");
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background ambient-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img
                src="/baymax.jpg"
                alt="NeuraPulse Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
              />
              <span className="text-xl font-bold text-foreground">NeuraPulse AI</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <NotificationCenter userId={user.id} />
              <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="chat" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto gap-2 glass-panel p-2 bg-transparent">
            <TabsTrigger value="chat" className="flex items-center gap-2 py-3">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="health-log" className="flex items-center gap-2 py-3">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Health Log</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2 py-3">
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Medications</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2 py-3">
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="sensors" className="flex items-center gap-2 py-3">
              <Watch className="w-4 h-4" />
              <span className="hidden sm:inline">Wearables</span>
            </TabsTrigger>
            <TabsTrigger value="image-analysis" className="flex items-center gap-2 py-3">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Image AI</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Chat with NeuraPulse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIChatInterface userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health-log">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Daily Health Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HealthLogForm userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  Medication Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MedicationTracking userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                  Manage Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AppointmentBooking userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sensors">
            <div className="space-y-6">
              <GoogleFitConnect userId={user.id} />
              <WearableDataDashboard userId={user.id} />
            </div>
          </TabsContent>

          <TabsContent value="image-analysis">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  AI Image Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImageAnalysis userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HealthDashboard userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <EmailPreferences userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
