import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, CheckCircle, Bell } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Appointment {
  id: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  status: "scheduled" | "completed" | "cancelled" | "pending";
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image_url?: string;
  availability: string;
}

interface AppointmentBookingProps {
  userId: string;
}

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ userId }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const data = await api.get<Doctor[]>("/doctors");
      setDoctors(data);
    } catch (error) {
      console.error("Failed to load doctors", error);
    }
  };

  const fetchAppointments = async () => {
    if (!userId) return;

    try {
      const data = await api.get<Appointment[]>(`/appointments?user_id=${userId}`);
      // Sort: upcoming first
      const sorted = data.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
      setAppointments(sorted);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const handleBooking = async () => {
    if (!date || !selectedDoctor) {
      toast({
        title: "Missing Information",
        description: "Please select a doctor and date.",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const doctor = doctors.find(d => d.id === selectedDoctor);

      await api.post("/appointments", {
        user_id: userId,
        doctor_name: doctor?.name || "Unknown Doctor",
        specialty: doctor?.specialty || "General",
        appointment_date: date.toISOString(),
        notes: notes
      });

      toast({
        title: "Appointment Requested",
        description: "Your appointment is pending approval.",
      });

      setDate(undefined);
      setSelectedDoctor("");
      setNotes("");
      fetchAppointments();
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Could not book appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (appointment: Appointment) => {
    try {
      await api.post("/appointments/reminder", {
        appointment_id: appointment.id
      });
      toast({ title: "Reminder Sent", description: "A reminder has been sent to your email.", variant: "default" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({ title: "Error", description: "Failed to send reminder.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Booking Form */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Book an Appointment</CardTitle>
              <CardDescription>Select a specialist and preferred date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Doctor Selection */}
              <div className="space-y-3">
                <Label>Select Specialist</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No doctors available</div>
                    ) : (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialty}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-3">
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label>Reason for Visit</Label>
                <Textarea
                  placeholder="Briefly describe your symptoms or reason for visit..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleBooking} disabled={loading || !selectedDoctor}>
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Your Appointments</h3>
          {appointments.length === 0 ? (
            <Card className="glass-card border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>No upcoming appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <Card key={apt.id} className="glass-card transition-all hover:shadow-md">
                  <CardContent className="p-4 flex items-start space-x-4">
                    <div className={cn("p-2 rounded-full",
                      apt.status === 'completed' ? "bg-green-100 dark:bg-green-900/20" :
                        apt.status === 'pending' ? "bg-yellow-100 dark:bg-yellow-900/20" :
                          "bg-blue-100 dark:bg-blue-900/20"
                    )}>
                      {apt.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                        apt.status === 'pending' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                          <CalendarIcon className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{apt.doctor_name}</p>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full capitalize",
                          apt.status === 'scheduled' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          apt.status === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                          apt.status === 'cancelled' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                          apt.status === 'pending' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        )}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(apt.appointment_date).toLocaleString()}
                      </div>

                      {/* Reminder Button */}
                      {(apt.status === 'scheduled' || apt.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8 text-xs"
                          onClick={() => handleSendReminder(apt)}
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          Send Reminder
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
