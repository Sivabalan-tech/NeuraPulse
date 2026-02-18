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
import { Activity, Moon, Zap, CalendarCheck, ClipboardList, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { HealthLog, Appointment } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { calculatePrediction } from "@/utils/predictionEngine";
import WellnessForecast from "@/components/WellnessForecast";

interface HealthDashboardProps {
    userId: string;
}

// Mood helper function remains here as it's specific to dashboard display logic or could be utils

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(0, 100, 200); // Primary Blue
        doc.text("NeuraPulse Health Report", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "PPP at pp")}`, 14, 28);
        doc.line(14, 32, 196, 32);

        // Vitals Summary
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Recent Health Logs", 14, 42);

        const logData = healthLogs.slice(0, 10).map(log => [
            format(new Date(log.log_date), "MMM d"),
            log.mood || "-",
            `${log.sleep_hours}h`,
            `${log.energy_level}/10`,
            log.symptoms || "None"
        ]);

        autoTable(doc, {
            startY: 48,
            head: [["Date", "Mood", "Sleep", "Energy", "Symptoms"]],
            body: logData,
            theme: 'grid',
            headStyles: { fillColor: [0, 100, 200] },
        });

        // Save
        doc.save(`Health_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    const fetchData = async () => {
        try {
            const [logsData, appointmentsData] = await Promise.all([
                api.get<HealthLog[]>(`/health-logs?user_id=${userId}`),
                api.get<Appointment[]>(`/appointments?user_id=${userId}`)
            ]);

            // Sort logs by date (backend returns list, but maybe not sorted)
            const sortedLogs = (logsData || []).sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

            setHealthLogs(sortedLogs.slice(-30)); // Last 30 entries
            setAppointments(appointmentsData || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate wellness forecast
    const prediction = useMemo(() => calculatePrediction(healthLogs), [healthLogs]);

    // Calculate stats
    const stats = {
        totalLogs: healthLogs.length,
        avgSleep: healthLogs.length > 0
            ? (healthLogs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / healthLogs.filter(l => l.sleep_hours).length).toFixed(1)
            : "0",
        avgEnergy: healthLogs.length > 0
            ? (healthLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / healthLogs.filter(l => l.energy_level).length).toFixed(1)
            : "0",
        upcomingAppointments: appointments.filter(a => a.status === "approved" && new Date(a.appointment_date) >= new Date()).length
    };

    // Prepare chart data
    const chartData = healthLogs.map(log => ({
        date: format(new Date(log.log_date), "MMM d"),
        sleep: log.sleep_hours || 0,
        energy: log.energy_level || 0,
        mood: moodToNumber(log.mood)
    }));

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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

                <Card className="bg-secondary/50 border-border">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Appointments</p>
                                <p className="text-2xl font-bold text-foreground">{stats.upcomingAppointments}</p>
                                <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CalendarCheck className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Wellness Forecast (Predictive Engine) */}
            <div className="mb-6">
                <WellnessForecast prediction={prediction} />
            </div>

            {/* Charts */}
            {chartData.length > 0 ? (
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
                                        <XAxis
                                            dataKey="date"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            domain={[0, 12]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sleep"
                                            stroke="hsl(var(--primary))"
                                            fill="hsl(var(--primary) / 0.2)"
                                            strokeWidth={2}
                                            name="Hours"
                                        />
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
                                        <XAxis
                                            dataKey="date"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            domain={[0, 10]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="energy"
                                            stroke="hsl(var(--accent))"
                                            strokeWidth={2}
                                            dot={{ fill: 'hsl(var(--accent))' }}
                                            name="Energy"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="mood"
                                            stroke="hsl(var(--destructive))"
                                            strokeWidth={2}
                                            dot={{ fill: 'hsl(var(--destructive))' }}
                                            name="Mood"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="border-border">
                    <CardContent className="p-8 text-center">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
                        <p className="text-muted-foreground">
                            Start logging your health data to see trends and insights here.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default HealthDashboard;
