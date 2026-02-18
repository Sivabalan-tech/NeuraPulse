import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Flame, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface WearableDataDashboardProps {
    userId: string;
}

const WearableDataDashboard: React.FC<WearableDataDashboardProps> = ({ userId }) => {
    const [latestData, setLatestData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLatestData();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchLatestData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [userId]);

    const fetchLatestData = async () => {
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/google-fit/latest?user_id=${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLatestData(data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getHeartRateStatus = (bpm: number) => {
        if (bpm < 60) return { status: "Low", color: "text-blue-500", bg: "bg-blue-500/10" };
        if (bpm > 100) return { status: "High", color: "text-red-500", bg: "bg-red-500/10" };
        return { status: "Normal", color: "text-green-500", bg: "bg-green-500/10" };
    };

    const getStepsProgress = (steps: number) => {
        const goal = 10000;
        return Math.min((steps / goal) * 100, 100);
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

    if (!latestData || Object.keys(latestData).length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Activity className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">No wearable data yet</p>
                    <p className="text-xs mt-2">Click "Sync Now" to fetch your health data</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Heart Rate */}
                {latestData.heart_rate && (
                    <Card>
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
                                {new Date(latestData.heart_rate.recorded_at).toLocaleTimeString()}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Steps */}
                {latestData.steps && (
                    <Card>
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
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Calories */}
                {latestData.calories && (
                    <Card>
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
                                Today's activity
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Weight */}
                {latestData.weight && (
                    <Card>
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
                                {new Date(latestData.weight.recorded_at).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Data Source Info */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span>Synced from Google Fit</span>
                        </div>
                        <span>Auto-updates every 5 minutes</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WearableDataDashboard;
