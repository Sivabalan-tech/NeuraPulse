import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { Activity, Moon, Zap, ClipboardList, Loader2, Heart, Footprints, Flame } from "lucide-react";
import { format } from "date-fns";
import { HealthLog, Appointment } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculatePrediction } from "@/utils/predictionEngine";
import WellnessForecast from "@/components/WellnessForecast";
import { Progress } from "@/components/ui/progress";

interface HealthDashboardProps {
    userId: string;
}

const moodToNumber = (mood: string | null): number => {
    switch (mood) {
        case "excellent": return 5;
        case "good": return 4;
        case "okay": return 3;
        case "low": return 2;
        case "bad": return 1;
        default: return 0;
    }
};

const HealthDashboard = ({ userId }: HealthDashboardProps) => {
    const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [wearableData, setWearableData] = useState<any>(null);
    const [wearableHistory, setWearableHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.setTextColor(0, 100, 200);
        doc.text("NeuraPulse Health Report", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "PPP at pp")}`, 14, 28);
        doc.line(14, 32, 196, 32);

        // Wearable summary section
        if (wearableData) {
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text("Wearable Data Summary", 14, 42);
            const wearableRows = [
                ["Heart Rate", wearableData.heart_rate ? `${wearableData.heart_rate.value} bpm` : "N/A"],
                ["Steps Today", wearableData.steps ? `${wearableData.steps.value.toLocaleString()} steps` : "N/A"],
                ["Calories", wearableData.calories ? `${Math.round(wearableData.calories.value)} kcal` : "N/A"],
                ["Weight", wearableData.weight ? `${wearableData.weight.value} kg` : "N/A"],
            ];
            autoTable(doc, {
                startY: 48,
                head: [["Metric", "Value"]],
                body: wearableRows,
                theme: 'grid',
                headStyles: { fillColor: [0, 100, 200] },
            });
        }

        const afterWearable = (doc as any).lastAutoTable?.finalY ?? 90;

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Recent Health Logs", 14, afterWearable + 12);

        const logData = healthLogs.slice(0, 10).map(log => [
            format(new Date(log.log_date), "MMM d"),
            log.mood || "-",
            `${log.sleep_hours}h`,
            `${log.energy_level}/10`,
            log.symptoms || "None"
        ]);

        autoTable(doc, {
            startY: afterWearable + 18,
            head: [["Date", "Mood", "Sleep", "Energy", "Symptoms"]],
            body: logData,
            theme: 'grid',
            headStyles: { fillColor: [0, 100, 200] },
        });

        doc.save(`Health_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("baymax_token") || localStorage.getItem("neurapulse_token");

            // Fetch health logs, appointments and wearable data in parallel
            const [logsData, appointmentsData, fitLatestRes, fitHistoryRes] = await Promise.all([
                api.get<HealthLog[]>(`/health-logs?user_id=${userId}`),
                api.get<Appointment[]>(`/appointments?user_id=${userId}`),
                fetch(`http://localhost:5000/api/google-fit/latest?user_id=${userId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`http://localhost:5000/api/google-fit/history?user_id=${userId}&days=30`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ]);

            const sortedLogs = (logsData || []).sort(
                (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
            );
            setHealthLogs(sortedLogs.slice(-30));
            setAppointments(appointmentsData || []);

            if (fitLatestRes.ok) {
                const latest = await fitLatestRes.json();
                const hasData = Object.keys(latest).some(k => k !== 'last_sync' && latest[k]);
                if (hasData) setWearableData(latest);
            }

            if (fitHistoryRes.ok) {
                const history = await fitHistoryRes.json();
                setWearableHistory(history);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const prediction = useMemo(() => calculatePrediction(healthLogs, wearableHistory), [healthLogs, wearableHistory]);

    const chartData = useMemo(() => {
        return healthLogs.map(log => {
            const dateStr = format(new Date(log.log_date), "MMM d");
            const daySteps = wearableHistory?.steps?.find((s: any) => s.date === log.log_date)?.value || 0;
            const dayCalories = wearableHistory?.calories?.find((s: any) => s.date === log.log_date)?.value || 0;

            return {
                name: dateStr,
                sleep: log.sleep_hours || 0,
                energy: log.energy_level || 0,
                mood: moodToNumber(log.mood),
                steps: daySteps,
                calories: dayCalories
            };
        });
    }, [healthLogs, wearableHistory]);

    const hrChartData = useMemo(() => {
        if (!wearableHistory?.heart_rate) return [];
        // Group by date or just show recent readings
        return wearableHistory.heart_rate.slice(-20).map((r: any) => ({
            time: format(new Date(r.recorded_at), "HH:mm"),
            val: r.value
        }));
    }, [wearableHistory]);

    const stats = useMemo(() => ({
        totalLogs: healthLogs.length,
        avgSleep: healthLogs.length > 0
            ? (healthLogs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / (healthLogs.filter(l => l.sleep_hours).length || 1)).toFixed(1)
            : "0",
        avgEnergy: healthLogs.length > 0
            ? (healthLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / (healthLogs.filter(l => l.energy_level).length || 1)).toFixed(1)
            : "0",
        upcomingAppointments: appointments.filter(
            a => a.status === "approved" && new Date(a.appointment_date) >= new Date()
        ).length
    }), [healthLogs, appointments]);



    const getHeartRateStatus = (bpm: number) => {
        if (bpm < 60) return { label: "Low", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
        if (bpm > 100) return { label: "High", color: "bg-red-500/10 text-red-500 border-red-500/20" };
        return { label: "Normal", color: "bg-green-500/10 text-green-500 border-green-500/20" };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Health Overview</h2>
                    <p className="text-muted-foreground mt-1">
                        Track your wellness journey and visualize your progress
                    </p>
                </div>
                <Button onClick={generatePDF} variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Export Doctor's Report
                </Button>
            </div>



            {/* ── Unified Health Metrics ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Health Metrics
                    </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Health Logs Count */}
                    <Card className="bg-secondary/50 border-border">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Health Logs</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalLogs}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total entries</p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <ClipboardList className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Avg Sleep */}
                    <Card className="bg-secondary/50 border-border">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Avg Sleep</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.avgSleep}h</p>
                                    <p className="text-xs text-muted-foreground mt-1">Per night</p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Moon className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Avg Energy */}
                    <Card className="bg-secondary/50 border-border">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Avg Energy</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.avgEnergy}/10</p>
                                    <p className="text-xs text-muted-foreground mt-1">Energy level</p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-accent" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Heart Rate (from wearable) */}
                    {wearableData?.heart_rate && (
                        <Card className="border-red-500/20 bg-red-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Heart Rate</p>
                                        <p className="text-2xl font-bold">{wearableData.heart_rate.value}</p>
                                        <p className="text-xs text-muted-foreground mt-1">bpm · Google Fit</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                        <Heart className="w-5 h-5 text-red-500" />
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`mt-2 text-xs border ${getHeartRateStatus(wearableData.heart_rate.value).color}`}
                                >
                                    {getHeartRateStatus(wearableData.heart_rate.value).label}
                                </Badge>
                            </CardContent>
                        </Card>
                    )}

                    {/* Steps (from wearable) */}
                    {wearableData?.steps && (
                        <Card className="border-blue-500/20 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Steps Today</p>
                                        <p className="text-2xl font-bold">{wearableData.steps.value.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground mt-1">/ 10,000 goal · Google Fit</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Footprints className="w-5 h-5 text-blue-500" />
                                    </div>
                                </div>
                                <Progress
                                    value={Math.min((wearableData.steps.value / 10000) * 100, 100)}
                                    className="mt-3 h-1.5"
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Calories (from wearable) */}
                    {wearableData?.calories && (
                        <Card className="border-orange-500/20 bg-orange-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Calories Burned</p>
                                        <p className="text-2xl font-bold">{Math.round(wearableData.calories.value)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">kcal · Google Fit</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>


            {/* Wellness Forecast */}
            <div className="mb-6">
                <WellnessForecast prediction={prediction} />
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Sleep Chart */}
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Moon className="w-5 h-5 text-primary" />
                                Sleep Trend
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 12]} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                                        <Area type="monotone" dataKey="sleep" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} name="Hours" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Energy & Mood Chart */}
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-accent" />
                                Energy & Mood
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 10]} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                                        <Line type="monotone" dataKey="energy" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} name="Energy" />
                                        <Line type="monotone" dataKey="mood" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))' }} name="Mood" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Wearable Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Steps History */}
                {chartData.some(d => d.steps > 0) && (
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Footprints className="w-5 h-5 text-blue-500" />
                                Steps Activity
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                                        <Area type="monotone" dataKey="steps" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="Steps" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Heart Rate History */}
                {hrChartData.length > 0 && (
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-red-500" />
                                Heart Rate Trend (Recent)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={hrChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                                        <Line type="monotone" dataKey="val" stroke="#ef4444" strokeWidth={2} dot={false} name="BPM" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* No health log data placeholder */}
            {chartData.length === 0 && !wearableData && (
                <Card className="border-border">
                    <CardContent className="p-8 text-center">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
                        <p className="text-muted-foreground">
                            Start logging your health data or connect Google Fit to see trends and insights here.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default HealthDashboard;
