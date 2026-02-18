import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PredictionResult } from "@/utils/predictionEngine";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WellnessForecastProps {
    prediction: PredictionResult | null;
}

const WellnessForecast = ({ prediction }: WellnessForecastProps) => {
    if (!prediction) return null;

    const data = [
        {
            subject: "Sleep",
            A: prediction.current.sleep,
            B: prediction.predicted.sleep,
            fullMark: 100,
        },
        {
            subject: "Energy",
            A: prediction.current.energy,
            B: prediction.predicted.energy,
            fullMark: 100,
        },
        {
            subject: "Mood",
            A: prediction.current.mood,
            B: prediction.predicted.mood,
            fullMark: 100,
        },
        {
            subject: "Overall",
            A: prediction.current.overall,
            B: prediction.predicted.overall,
            fullMark: 100,
        },
    ];

    const getRiskColor = (level: string) => {
        switch (level) {
            case "High": return "text-red-500";
            case "Moderate": return "text-yellow-500";
            default: return "text-green-500";
        }
    };

    return (
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-card to-secondary/50 border-primary/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            NeuraPulse Predictive Engine
                        </CardTitle>
                        <CardDescription>AI-driven wellness forecast for tomorrow</CardDescription>
                    </div>
                    <div className={cn("flex items-center gap-2 font-bold", getRiskColor(prediction.riskLevel))}>
                        {prediction.riskLevel === "High" ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                        Risk Level: {prediction.riskLevel}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                                <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Current State"
                                    dataKey="A"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.3}
                                />
                                <Radar
                                    name="Predicted State"
                                    dataKey="B"
                                    stroke="#8884d8"
                                    fill="#8884d8"
                                    fillOpacity={0.3}
                                />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-background/50 border border-border">
                            <h4 className="font-semibold mb-2 text-primary">AI Insight</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {prediction.insight}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-lg bg-background/40">
                                <div className="text-xl font-bold">{prediction.current.overall}</div>
                                <div className="text-xs text-muted-foreground">Current Score</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <div className="text-xl font-bold text-primary">{prediction.predicted.overall}</div>
                                <div className="text-xs text-muted-foreground">Predicted Score</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default WellnessForecast;
