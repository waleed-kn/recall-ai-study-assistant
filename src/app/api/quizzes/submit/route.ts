import { NextResponse } from "next/server";
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
                correctOptionId: correctOption?.id,
                isCorrect,
                explanation: question.explanation,
            };
        });
        const correctAnswers = results.filter((result) => result.isCorrect).length;
        const score = Math.round((correctAnswers / quiz.questions.length) * 100);

        const attempt = await getPrisma().quizAttempt.create({
            data: {
                quizId: quiz.id,
                userId: input.data.userId,
                completedAt: new Date(),
                score,
                answers: {
                    create: results.map((result) => ({
                        questionId: result.questionId,
                        selectedOptionId: result.selectedOptionId,
                        isCorrect: result.isCorrect,
                    })),
                },
            },
        });

        return NextResponse.json({
            attemptId: attempt.id,
            score,
            correctAnswers,
            totalQuestions: quiz.questions.length,
            results,
        });
    } catch (error) {
        console.error("Quiz submission failed", error);
        return NextResponse.json({ error: "Unable to submit this quiz right now." }, { status: 500 });
    }
}