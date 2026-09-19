import { NextResponse } from "next/server";
import { getTopicStrength, topicAnalyticsRequestSchema } from "@/lib/analytics";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const input = topicAnalyticsRequestSchema.safeParse({
        userId: new URL(request.url).searchParams.get("userId"),
    });

    if (!input.success) {
        return NextResponse.json({ error: "A valid user is required." }, { status: 400 });
    }

    const progress = await getPrisma().userTopicProgress.findMany({
        where: { userId: input.data.userId },
        include: { topic: { select: { name: true } } },
        orderBy: { masteryScore: "desc" },
    });

    return NextResponse.json({
        topics: progress.map((item) => ({
            topic: item.topic.name,
            correctAnswers: item.correctAnswers,
            incorrectAnswers: item.incorrectAnswers,
            accuracy: Number(item.masteryScore ?? 0),
            strength: getTopicStrength(item.correctAnswers, item.incorrectAnswers),
        })),
    });
}