import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Pill, Heart, Moon, Zap, Save, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface HealthLogFormProps {
  userId: string;
}

interface HealthLog {
  id: string;
  log_date: string;
  symptoms: string | null;
  medications: string | null;
  mood: string | null;
  sleep_hours: number | null;
  energy_level: number | null;
  notes: string | null;
}

const moodOptions = [
  { value: "excellent", label: "😊 Excellent" },
  { value: "good", label: "🙂 Good" },
  { value: "okay", label: "😐 Okay" },
  { value: "low", label: "😔 Low" },
  { value: "bad", label: "😢 Bad" },
];

const HealthLogForm = ({ userId }: HealthLogFormProps) => {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [symptoms, setSymptoms] = useState("");
  const [medications, setMedications] = useState("");
  const [mood, setMood] = useState("");
  const [sleepHours, setSleepHours] = useState(7);
  const [energyLevel, setEnergyLevel] = useState([5]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const fetchLogs = async () => {
    try {
      const data = await api.get<HealthLog[]>(`/health-logs?user_id=${userId}`);
      // Sort by date descending
      const sorted = (data || []).sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
      setLogs(sorted.slice(0, 10));
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/health-logs", {
        user_id: userId,
        log_date: logDate,
        symptoms: symptoms || null,
        medications: medications || null,
        mood: mood || null,
        sleep_hours: sleepHours,
        energy_level: energyLevel[0],
        notes: notes || null,
      });

      toast({ title: "Success", description: "Health log saved successfully!" });

      // Reset form
      setSymptoms("");
      setMedications("");
      setMood("");
      setSleepHours(7);
      setEnergyLevel([5]);
      setNotes("");

      fetchLogs();
    } catch (error) {
      console.error("Error saving log:", error);
      toast({ title: "Error", description: "Failed to save health log", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/health-logs/${id}`);
      toast({ title: "Deleted", description: "Health log removed" });
      fetchLogs();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete log", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="log-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Date
            </Label>
            <Input
              id="log-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <Label htmlFor="mood" className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Mood
            </Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue placeholder="How are you feeling?" />
              </SelectTrigger>
              <SelectContent>
                {moodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Symptoms */}
        <div className="space-y-2">
          <Label htmlFor="symptoms" className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" />
            Symptoms
          </Label>
          <Textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe any symptoms you're experiencing..."
            rows={3}
          />
        </div>

        {/* Medications */}
        <div className="space-y-2">
          <Label htmlFor="medications" className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-accent" />
            Medications
          </Label>
          <Textarea
            id="medications"
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder="List any medications taken today..."
            rows={2}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sleep Hours */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-primary" />
              Sleep Hours: {sleepHours}h
            </Label>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Energy Level */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-chart-4" />
              Energy Level: {energyLevel[0]}/10
            </Label>
            <Slider
              value={energyLevel}
              onValueChange={setEnergyLevel}
              min={1}
              max={10}
              step={1}
              className="py-4"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other observations or notes..."
            rows={2}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Health Log
        </Button>
      </form>

      {/* Recent Logs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Logs</h3>
        {loadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No health logs yet. Start tracking today!</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-secondary/50 rounded-lg p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {format(new Date(log.log_date), "MMMM d, yyyy")}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {log.mood && <span>Mood: {log.mood}</span>}
                    {log.sleep_hours && <span>• Sleep: {log.sleep_hours}h</span>}
                    {log.energy_level && <span>• Energy: {log.energy_level}/10</span>}
                  </div>
                  {log.symptoms && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Symptoms: {log.symptoms.substring(0, 100)}...
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(log.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthLogForm;
