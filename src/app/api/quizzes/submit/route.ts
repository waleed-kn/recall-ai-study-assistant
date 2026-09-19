import { NextResponse } from "next/server";
import { getTopicStrength } from "@/lib/analytics";
import { submitQuizRequestSchema } from "@/lib/quizzes";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const input = submitQuizRequestSchema.safeParse(await request.json());

        if (!input.success) {
            return NextResponse.json({ error: "Invalid quiz submission." }, { status: 400 });
        }

        const quiz = await getPrisma().quiz.findFirst({
            where: { id: input.data.quizId, userId: input.data.userId },
            include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
        }

        const questionIds = new Set(quiz.questions.map((question) => question.id));
        const submittedQuestionIds = new Set<string>();

        for (const answer of input.data.answers) {
            if (!questionIds.has(answer.questionId) || submittedQuestionIds.has(answer.questionId)) {
                return NextResponse.json({ error: "Invalid answers for this quiz." }, { status: 400 });
            }

            submittedQuestionIds.add(answer.questionId);
            if (answer.selectedOptionId) {
                const question = quiz.questions.find((item) => item.id === answer.questionId);
                if (!question?.options.some((option) => option.id === answer.selectedOptionId)) {
                    return NextResponse.json({ error: "An answer does not belong to its question." }, { status: 400 });
                }
            }
        }

        const submittedAnswers = new Map(
            input.data.answers.map((answer) => [answer.questionId, answer.selectedOptionId]),
        );
        const results = quiz.questions.map((question) => {
            const selectedOptionId = submittedAnswers.get(question.id) ?? null;
            const correctOption = question.options.find((option) => option.isCorrect);
            const isCorrect = selectedOptionId === correctOption?.id;

            return {
                questionId: question.id,
                selectedOptionId,
                selectedAnswer: question.options.find((option) => option.id === selectedOptionId)?.text ?? null,
                correctOptionId: correctOption?.id,
                correctAnswer: correctOption?.text ?? "",
                topic: question.topic,
                isCorrect,
                explanation: question.explanation,
            };
        });
        const correctAnswers = results.filter((result) => result.isCorrect).length;
        const score = Math.round((correctAnswers / quiz.questions.length) * 100);

        const attempt = await getPrisma().$transaction(async (transaction) => {
            const createdAttempt = await transaction.quizAttempt.create({
                data: {
                    quizId: quiz.id,
                    userId: input.data.userId,
                    completedAt: new Date(),
                    score,
                    answers: {
                        create: results.map((result) => ({
                            questionId: result.questionId,
                            selectedOptionId: result.selectedOptionId,
                            selectedAnswer: result.selectedAnswer,
                            correctAnswer: result.correctAnswer,
                            topic: result.topic,
                            isCorrect: result.isCorrect,
                        })),
                    },
                },
            });

            for (const question of quiz.questions) {
                const result = results.find((item) => item.questionId === question.id);
                if (!result) continue;

                const topic = await transaction.topic.upsert({
                    where: { name: question.topic },
                    update: {},
                    create: { name: question.topic },
                });
                const progress = await transaction.userTopicProgress.upsert({
                    where: { userId_topicId: { userId: input.data.userId, topicId: topic.id } },
                    update: {},
                    create: { userId: input.data.userId, topicId: topic.id },
                });
                const correctAnswersForTopic = progress.correctAnswers + (result.isCorrect ? 1 : 0);
                const incorrectAnswersForTopic = progress.incorrectAnswers + (result.isCorrect ? 0 : 1);
                const totalAnswersForTopic = correctAnswersForTopic + incorrectAnswersForTopic;

                await transaction.userTopicProgress.update({
                    where: { id: progress.id },
                    data: {
                        correctAnswers: correctAnswersForTopic,
                        incorrectAnswers: incorrectAnswersForTopic,
                        masteryScore: (correctAnswersForTopic / totalAnswersForTopic) * 100,
                        lastReviewedAt: new Date(),
                    },
                });
            }

            return createdAttempt;
        });

        const topicProgress = await getPrisma().userTopicProgress.findMany({
            where: { userId: input.data.userId },
            include: { topic: { select: { name: true } } },
            orderBy: { masteryScore: "desc" },
        });

        return NextResponse.json({
            attemptId: attempt.id,
            score,
            correctAnswers,
            totalQuestions: quiz.questions.length,
            results,
            topicProgress: topicProgress.map((progress) => ({
                topic: progress.topic.name,
                correctAnswers: progress.correctAnswers,
                incorrectAnswers: progress.incorrectAnswers,
                accuracy: Number(progress.masteryScore ?? 0),
                strength: getTopicStrength(progress.correctAnswers, progress.incorrectAnswers),
            })),
        });
    } catch (error) {
        console.error("Quiz submission failed", error);
        return NextResponse.json({ error: "Unable to submit this quiz right now." }, { status: 500 });
    }
}