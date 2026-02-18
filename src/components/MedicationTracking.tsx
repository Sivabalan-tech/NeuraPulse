import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pill, Plus, Trash2, Clock, Loader2, Check, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string;
  reminder_times: string[] | null;
  is_active: boolean | null;
  created_at: string;
}

interface MedicationTrackingProps {
  userId: string;
}

const MedicationTracking = ({ userId }: MedicationTrackingProps) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [takenMeds, setTakenMeds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form state
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [reminderTime, setReminderTime] = useState("09:00");

  useEffect(() => {
    fetchMedications();
    fetchTodayLog();
  }, [userId]);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const data = await api.get<Medication[]>(`/medications?user_id=${userId}`);
      setMedications(data || []);
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast({
        title: "Error",
        description: "Failed to load medications.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const fetchTodayLog = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      // Correct type to include medications string property
      const data = await api.get<{ medications?: string }>(`/health-logs?user_id=${userId}&date=${today}`);

      if (data && data.medications) {
        const takenList = data.medications.split(",").map((m: string) => m.trim());
        setTakenMeds(new Set(takenList));
      }
    } catch (error) {
      console.error("Error fetching logs", error);
    }
  };

  const toggleTaken = async (medName: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const newtakenMeds = new Set(takenMeds);
    let action = "marked as taken";

    if (newtakenMeds.has(medName)) {
      newtakenMeds.delete(medName);
      action = "unmarked";
    } else {
      newtakenMeds.add(medName);
    }

    setTakenMeds(newtakenMeds); // Optimistic update

    const medString = Array.from(newtakenMeds).join(", ");

    try {
      await api.post("/health-logs", {
        user_id: userId,
        log_date: today,
        medications: medString
      });

      toast({
        title: action === "marked as taken" ? "Medication Taken" : "Undone",
        description: `Marked ${medName} as ${action === "marked as taken" ? "taken" : "not taken"} for today.`,
      });
    } catch (error) {
      console.error("Error updating log:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
      fetchTodayLog(); // Revert
    }
  };


  const handleAddMedication = async () => {
    if (!medicationName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a medication name.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post("/medications", {
        user_id: userId,
        medication_name: medicationName.trim(),
        dosage: dosage.trim() || null,
        frequency,
        reminder_times: [reminderTime],
        is_active: true,
      });

      toast({
        title: "Medication Added",
        description: `${medicationName} has been added to your reminders.`,
      });
      setMedicationName("");
      setDosage("");
      setFrequency("daily");
      setReminderTime("09:00");
      setDialogOpen(false);
      fetchMedications();
    } catch (error) {
      console.error("Error adding medication:", error);
      toast({
        title: "Error",
        description: "Failed to add medication.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleToggleActive = async (medication: Medication) => {
    try {
      await api.put(`/medications/${medication.id}`, {
        is_active: !medication.is_active
      });

      setMedications((prev) =>
        prev.map((m) =>
          m.id === medication.id ? { ...m, is_active: !m.is_active } : m
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update medication status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      await api.delete(`/medications/${id}`);

      toast({
        title: "Medication Removed",
        description: "The medication has been removed from your list.",
      });
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete medication.",
        variant: "destructive",
      });
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: "Daily",
      twice_daily: "Twice Daily",
      weekly: "Weekly",
      as_needed: "As Needed",
    };
    return labels[freq] || freq;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Your Medications</h3>
          <p className="text-sm text-muted-foreground">
            Track your medications and set reminders
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
              <DialogDescription>
                Enter the details of your medication to set up reminders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="med-name">Medication Name *</Label>
                <Input
                  id="med-name"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g., Aspirin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 100mg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="as_needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Reminder Time</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddMedication}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medication
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Medications List */}
      {medications.length === 0 ? (
        <Card className="glass-card border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No medications added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first medication to start tracking and get reminders.
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Medication
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {medications.map((medication) => {
            const isTaken = takenMeds.has(medication.medication_name);
            return (
              <Card
                key={medication.id}
                className={medication.is_active ? "glass-card border-none" : "glass-card border-none opacity-60"}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        isTaken ? "bg-green-100 dark:bg-green-900" : "bg-primary/10"
                      )}>
                        {isTaken ? (
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Pill className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className={cn("text-base", isTaken && "text-green-700 dark:text-green-400 decoration-green-500")}>
                          {medication.medication_name}
                        </CardTitle>
                        {medication.dosage && (
                          <p className="text-sm text-muted-foreground">
                            {medication.dosage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mark as Taken Button */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          isTaken ? "text-green-600 hover:text-green-700 bg-green-100/50" : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => toggleTaken(medication.medication_name)}
                        title={isTaken ? "Mark as not taken" : "Mark as taken today"}
                      >
                        {isTaken ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </Button>

                      <Switch
                        checked={!!medication.is_active}
                        onCheckedChange={() => handleToggleActive(medication)}
                        aria-label="Toggle active status"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className={isTaken ? "bg-green-100 text-green-800" : ""}>
                        {getFrequencyLabel(medication.frequency)}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {medication.reminder_times?.[0] || "No time set"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteMedication(medication.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isTaken ? "Taken today" : "Not taken yet today"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default MedicationTracking;
