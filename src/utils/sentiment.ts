export const analyzeSentiment = (text: string): { score: number; mood: string; color: string } => {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    // Simple dictionary of weighted words (AFINN-inspired subset)
    const sentimentDict: Record<string, number> = {
        // POSITIVE
        happy: 3, joy: 3, excited: 3, excellent: 3, amazing: 4, wonderful: 4,
        good: 2, great: 3, fine: 1, ok: 1, okay: 1,
        better: 2, best: 3, love: 3, like: 2, thanks: 1, thank: 1,
        calm: 2, relaxed: 2, energetic: 3, strong: 2, healthy: 2,

        // NEGATIVE
        sad: -3, bad: -2, terrible: -4, awful: -4, horrible: -4,
        pain: -2, hurt: -2, hurts: -2, ache: -2, aching: -2,
        tired: -2, fatigue: -2, exhausted: -3, weak: -2,
        sick: -3, ill: -3, fever: -2, cold: -1, flu: -2,
        stressed: -3, anxious: -3, worry: -2, worried: -2,
        angry: -3, mad: -3, hate: -3, difficult: -2, hard: -2
    };

    words.forEach(word => {
        // Basic stemming check (e.g. "pains" -> "pain")
        const root = word.replace(/s$|ing$|ed$/, "");
        if (sentimentDict[word]) score += sentimentDict[word];
        else if (sentimentDict[root]) score += sentimentDict[root];
    });

    // Normalize mood
    let mood = "Neutral";
    let color = "bg-gray-500";

    if (score >= 3) {
        mood = "Happy";
        color = "bg-green-500";
    } else if (score > 0) {
        mood = "Positive";
        color = "bg-green-400";
    } else if (score <= -3) {
        mood = "Stressed/Sad";
        color = "bg-red-500";
    } else if (score < 0) {
        mood = "Low";
        color = "bg-orange-500";
    }

    return { score, mood, color };
};
