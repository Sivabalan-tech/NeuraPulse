import { HealthLog } from "@/types";

export interface WellnessMetrics {
    sleep: number;
    energy: number;
    mood: number;
    overall: number;
}

export interface PredictionResult {
    current: WellnessMetrics;
    predicted: WellnessMetrics;
    riskLevel: "Low" | "Moderate" | "High";
    insight: string;
}

const moodToNumber = (mood: string | null): number => {
    switch (mood?.toLowerCase()) {
        case "excellent": return 100;
        case "happy": return 90;
        case "good": return 80;
        case "okay": return 60;
        case "neutral": return 50;
        case "low": return 40;
        case "sad": return 30;
        case "bad": return 20;
        case "terrible": return 10;
        default: return 50;
    }
};

export const calculatePrediction = (logs: HealthLog[]): PredictionResult | null => {
    if (!logs || logs.length < 2) return null;

    // Sort by date (ascending)
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );

    // Take last 7 days
    const recentLogs = sortedLogs.slice(-7);

    // Calculate Weights (Recent days have higher impact)
    // Simple Linear Weight: 1, 2, 3...
    let totalSleep = 0, totalEnergy = 0, totalMood = 0;
    let weightSum = 0;

    recentLogs.forEach((log, index) => {
        const weight = index + 1; // More recent = higher weight
        weightSum += weight;

        // Sleep (Normalize to 0-100, assuming 8h is 100)
        const sleepScore = Math.min(((log.sleep_hours || 0) / 8) * 100, 100);
        totalSleep += sleepScore * weight;

        // Energy (0-10) -> 0-100
        const energyScore = (log.energy_level || 0) * 10;
        totalEnergy += energyScore * weight;

        // Mood
        totalMood += moodToNumber(log.mood) * weight;
    });

    const predictedSleep = Math.round(totalSleep / weightSum);
    const predictedEnergy = Math.round(totalEnergy / weightSum);
    const predictedMood = Math.round(totalMood / weightSum);
    const predictedOverall = Math.round((predictedSleep * 0.4) + (predictedEnergy * 0.3) + (predictedMood * 0.3));

    // Current State (Last Log)
    const lastLog = recentLogs[recentLogs.length - 1];
    const currentSleep = Math.min(((lastLog.sleep_hours || 0) / 8) * 100, 100);
    const currentEnergy = (lastLog.energy_level || 0) * 10;
    const currentMood = moodToNumber(lastLog.mood);
    const currentOverall = Math.round((currentSleep * 0.4) + (currentEnergy * 0.3) + (currentMood * 0.3));

    let riskLevel: "Low" | "Moderate" | "High" = "Low";
    let insight = "Your wellness trend is positive. Keep it up!";

    if (predictedOverall < 50) {
        riskLevel = "High";
        insight = "Warning: High risk of burnout detected. Prioritize rest tomorrow.";
    } else if (predictedOverall < 70) {
        riskLevel = "Moderate";
        insight = "Caution: fast-paced trend. Consider light activity.";
    }

    return {
        current: {
            sleep: currentSleep,
            energy: currentEnergy,
            mood: currentMood,
            overall: currentOverall
        },
        predicted: {
            sleep: predictedSleep,
            energy: predictedEnergy,
            mood: predictedMood,
            overall: predictedOverall
        },
        riskLevel,
        insight
    };
};
