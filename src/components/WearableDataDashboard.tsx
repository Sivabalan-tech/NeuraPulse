import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Flame, TrendingDown, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WearableDataDashboardProps {
    userId: string;
}

const WearableDataDashboard: React.FC<WearableDataDashboardProps> = ({ userId }) => {
    const [latestData, setLatestData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchLatestData = useCallback(async () => {
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/google-fit/latest?user_id=${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setLatestData(data);
                if (data.last_sync) {
                    setLastSynced(data.last_sync);
                }
                setSyncError(null);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const handleSyncNow = async () => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncErrors({});
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch("http://localhost:5000/api/google-fit/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId, days: 7 })
            });

            const result = await response.json();

            if (!response.ok) {
                setSyncError(result.error || "Sync failed. Please try again.");
                toast({
                    title: "Sync Failed",
                    description: result.error || "Could not sync Google Fit data.",
                    variant: "destructive"
                });
            } else {
                // Surface any per-type errors
                if (result.errors && Object.keys(result.errors).length > 0) {
                    setSyncErrors(result.errors);
                    toast({
                        title: "Sync Partially Completed",
                        description: `Some data types failed: ${Object.keys(result.errors).join(", ")}`,
                        variant: "destructive"
                    });
                } else {
                    toast({
                        title: "✅ Sync Complete",
                        description: `Fetched: ${result.data_summary?.heart_rate_readings ?? 0} HR readings, ${result.data_summary?.activity_days ?? 0} days activity`,
                    });
                }
                // Refresh displayed data after sync
                await fetchLatestData();
            }
        } catch (error) {
            setSyncError("Network error during sync. Is the backend running?");
            toast({
                title: "Sync Error",
                description: "Could not reach backend. Please ensure the server is running.",
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchLatestData();
        // Auto-refresh from DB every 5 minutes (does not re-sync from Google Fit)
        const interval = setInterval(fetchLatestData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchLatestData]);

    const getHeartRateStatus = (bpm: number) => {
        if (bpm < 60) return { status: "Low", color: "text-blue-500", bg: "bg-blue-500/10" };
        if (bpm > 100) return { status: "High", color: "text-red-500", bg: "bg-red-500/10" };
        return { status: "Normal", color: "text-green-500", bg: "bg-green-500/10" };
    };

    const getStepsProgress = (steps: number) => {
        const goal = 10000;
        return Math.min((steps / goal) * 100, 100);
    };

    const formatLastSynced = (isoStr: string | null) => {
        if (!isoStr) return "Never synced";
        try {
            return new Date(isoStr).toLocaleString();
        } catch {
            return "Unknown";
        }
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-muted rounded w-24"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-32"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const hasData = latestData && Object.keys(latestData).some(k => k !== 'last_sync' && latestData[k]);

    return (
        <div className="space-y-6">
            {/* Sync Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Last synced: <strong>{formatLastSynced(lastSynced)}</strong></span>
                </div>
                <Button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? "Syncing from Google Fit..." : "Sync Now"}
                </Button>
            </div>

            {/* Sync Error Alert */}
            {syncError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{syncError}</span>
                </div>
            )}

            {/* Per-type Sync Errors */}
            {Object.keys(syncErrors).length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm border border-yellow-500/20 space-y-1">
                    <p className="font-medium">Some data types could not be synced:</p>
                    {Object.entries(syncErrors).map(([type, err]) => (
                        <p key={type} className="text-xs">• <strong>{type}:</strong> {err}</p>
                    ))}
                </div>
            )}

            {/* No Data State */}
            {!hasData ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                        <Activity className="w-12 h-12 opacity-40" />
                        <p className="text-sm font-medium">No wearable data yet</p>
                        <p className="text-xs text-center max-w-xs">
                            Click <strong>"Sync Now"</strong> above to pull your latest health data from Google Fit.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Heart Rate */}
                    {latestData?.heart_rate && (
                        <Card className="border-red-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    Heart Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{latestData.heart_rate.value}</span>
                                    <span className="text-sm text-muted-foreground">{latestData.heart_rate.unit}</span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`mt-2 ${getHeartRateStatus(latestData.heart_rate.value).bg} ${getHeartRateStatus(latestData.heart_rate.value).color} border-0`}
                                >
                                    {getHeartRateStatus(latestData.heart_rate.value).status}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {latestData.heart_rate.recorded_at
                                        ? new Date(latestData.heart_rate.recorded_at).toLocaleTimeString()
                                        : ''}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Steps */}
                    {latestData?.steps && (
                        <Card className="border-blue-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    Steps Today
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{latestData.steps.value.toLocaleString()}</span>
                                    <span className="text-sm text-muted-foreground">/ 10,000</span>
                                </div>
                                <Progress value={getStepsProgress(latestData.steps.value)} className="mt-3 h-2" />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {Math.round(getStepsProgress(latestData.steps.value))}% of daily goal
                                    {latestData.steps.date ? ` · ${latestData.steps.date}` : ''}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Calories */}
                    {latestData?.calories && (
                        <Card className="border-orange-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    Calories Burned
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{Math.round(latestData.calories.value)}</span>
                                    <span className="text-sm text-muted-foreground">{latestData.calories.unit}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    {latestData.calories.date ? `Date: ${latestData.calories.date}` : "Today's activity"}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Weight */}
                    {latestData?.weight && (
                        <Card className="border-purple-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-purple-500" />
                                    Weight
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{latestData.weight.value}</span>
                                    <span className="text-sm text-muted-foreground">{latestData.weight.unit}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    {latestData.weight.recorded_at
                                        ? new Date(latestData.weight.recorded_at).toLocaleDateString()
                                        : ''}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Data Source Info */}
            <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span>Synced from Google Fit</span>
                        </div>
                        <span>Auto-refreshes display every 5 minutes</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WearableDataDashboard;
