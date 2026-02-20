import { HealthLog } from "@/types";

export interface WellnessMetrics {
    sleep: number;
    energy: number;
    mood: number;
    overall: number;
}

export interface WearableData {
    heart_rate: { value: number, recorded_at: string }[];
    steps: { value: number, date: string }[];
    calories: { value: number, date: string }[];
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

export const calculatePrediction = (
    logs: HealthLog[],
    wearable: WearableData | null = null
): PredictionResult | null => {
    if (!logs || logs.length < 2) return null;

    // Sort by date (ascending)
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );

    // Take last 7 days
    const recentLogs = sortedLogs.slice(-7);

    let totalSleep = 0, totalEnergy = 0, totalMood = 0;
    let weightSum = 0;

    recentLogs.forEach((log, index) => {
        const weight = index + 1; // More recent = higher weight
        weightSum += weight;

        // Sleep (Normalize to 0-100, assuming 8h is 100)
        let sleepValue = log.sleep_hours || 0;
        const sleepScore = Math.min((sleepValue / 8) * 100, 100);
        totalSleep += sleepScore * weight;

        // Energy (0-10) -> 0-100
        let energyScore = (log.energy_level || 0) * 10;

        // Boost energy score if high activity (steps) on that day
        if (wearable?.steps) {
            const daySteps = wearable.steps.find(s => s.date === log.log_date);
            if (daySteps && daySteps.value > 8000) {
                energyScore = Math.min(energyScore + 10, 100); // 1.0 boost for active days
            }
        }
        totalEnergy += energyScore * weight;

        // Mood
        totalMood += moodToNumber(log.mood) * weight;
    });

    const predictedSleep = Math.round(totalSleep / weightSum);
    const predictedEnergy = Math.round(totalEnergy / weightSum);
    const predictedMood = Math.round(totalMood / weightSum);
    const predictedOverall = Math.round((predictedSleep * 0.4) + (predictedEnergy * 0.3) + (predictedMood * 0.3));

    // Current State (Last Log info)
    const lastLog = recentLogs[recentLogs.length - 1];
    const currentSleep = Math.min(((lastLog.sleep_hours || 0) / 8) * 100, 100);
    let currentEnergy = (lastLog.energy_level || 0) * 10;
    if (wearable?.steps) {
        const lastSteps = wearable.steps.find(s => s.date === lastLog.log_date);
        if (lastSteps && lastSteps.value > 8000) currentEnergy = Math.min(currentEnergy + 10, 100);
    }
    const currentMood = moodToNumber(lastLog.mood);
    const currentOverall = Math.round((currentSleep * 0.4) + (currentEnergy * 0.3) + (currentMood * 0.3));

    let riskLevel: "Low" | "Moderate" | "High" = "Low";
    let insight = "Your wellness trend is positive. Keep it up!";

    // Logic adjustments based on Heart Rate Trends
    let hrStressCount = 0;
    if (wearable?.heart_rate && wearable.heart_rate.length > 5) {
        // Simple check: if resting HR (using avg of readings if possible, or just latest) is high
        const avgHR = wearable.heart_rate.slice(-10).reduce((sum, r) => sum + r.value, 0) / 10;
        if (avgHR > 100) hrStressCount = 20; // Significant stress indicator
    }

    const finalOverall = Math.max(predictedOverall - hrStressCount, 0);

    if (finalOverall < 50) {
        riskLevel = "High";
        insight = hrStressCount > 0
            ? "Warning: High heart rate and low energy detected. Seek medical advice if persistent."
            : "Warning: High risk of burnout detected. Prioritize rest tomorrow.";
    } else if (finalOverall < 70) {
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
