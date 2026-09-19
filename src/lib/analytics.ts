import { z } from "zod";

export const topicStrengthSchema = z.enum(["Weak", "Medium", "Strong"]);
export type TopicStrength = z.infer<typeof topicStrengthSchema>;

export function getTopicStrength(correctAnswers: number, incorrectAnswers: number): TopicStrength {
    const totalAnswers = correctAnswers + incorrectAnswers;

    if (totalAnswers === 0) return "Medium";

    const accuracy = correctAnswers / totalAnswers;
    if (accuracy >= 0.8) return "Strong";
    if (accuracy < 0.6) return "Weak";
    return "Medium";
}

export const topicAnalyticsRequestSchema = z.object({
    userId: z.uuid(),
});