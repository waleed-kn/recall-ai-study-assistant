"use client";

import { FormEvent, useState } from "react";

type QuizOption = { id: string; text: string };
type QuizQuestion = {
    id: string;
    question: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    explanation: string | null;
    options: QuizOption[];
};
type Quiz = { id: string; title: string; questions: QuizQuestion[] };
type QuizResult = {
    questionId: string;
    selectedOptionId: string | null;
    correctOptionId?: string;
    isCorrect: boolean;
    explanation: string | null;
};

const difficultyStyles = {
    easy: "bg-[#e8f8f4] text-[#258b76]",
    medium: "bg-[#fff3df] text-[#ad712f]",
    hard: "bg-[#fce9ed] text-[#b85268]",
};

export default function QuizGenerator() {
    const currentUserId = process.env.NEXT_PUBLIC_CURRENT_USER_ID;
    const defaultDocumentId = process.env.NEXT_PUBLIC_CURRENT_DOCUMENT_ID ?? "";
    const [documentId, setDocumentId] = useState(defaultDocumentId);
    const [topic, setTopic] = useState("");
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<QuizResult[] | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function generateQuiz(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setQuiz(null);
        setResults(null);
        setScore(null);

        if (!currentUserId || !documentId) {
            setError("Configure a current user and document before generating a quiz.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/quizzes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId, documentId, topic: topic || undefined }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? "Unable to generate a quiz.");
            setQuiz(data.quiz);
            setAnswers({});
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to generate a quiz.");
        } finally {
            setIsLoading(false);
        }
    }

    async function submitQuiz(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!quiz || !currentUserId) return;
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/quizzes/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUserId,
                    quizId: quiz.id,
                    answers: quiz.questions.map((question) => ({
                        questionId: question.id,
                        selectedOptionId: answers[question.id] ?? null,
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? "Unable to submit the quiz.");
            setResults(data.results);
            setScore(data.score);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to submit the quiz.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className="mt-8 rounded-[20px] border border-[#ece9f1] bg-white p-5 sm:p-6">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a29caf]">AI quiz lab</p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Test your understanding</h2>
                <p className="mt-1 text-[12px] text-[#938c9c]">Generate a multiple-choice quiz from a saved study document.</p>
            </div>

            {!quiz && (
                <form onSubmit={generateQuiz} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="text-xs font-semibold text-[#5d5665]">
                        Document ID
                        <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} placeholder="Document UUID" className="mt-2 w-full rounded-lg border border-[#e8e4ed] bg-[#fcfbfd] px-3 py-2.5 text-xs font-normal outline-none focus:border-[#7157d9]" />
                    </label>
                    <label className="text-xs font-semibold text-[#5d5665]">
                        Topic (optional)
                        <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. neural networks" className="mt-2 w-full rounded-lg border border-[#e8e4ed] bg-[#fcfbfd] px-3 py-2.5 text-xs font-normal outline-none focus:border-[#7157d9]" />
                    </label>
                    <button type="submit" disabled={isLoading} className="rounded-lg bg-[#286e61] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1f5e52] disabled:cursor-wait disabled:opacity-50">
                        {isLoading ? "Generating..." : "Generate quiz"}
                    </button>
                </form>
            )}

            {quiz && (
                <form onSubmit={submitQuiz} className="mt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf2] pb-4">
                        <h3 className="text-sm font-semibold">{quiz.title}</h3>
                        {score === null ? <span className="text-[11px] text-[#938c9c]">{quiz.questions.length} questions</span> : <span className="rounded-md bg-[#e8f8f4] px-2.5 py-1 text-xs font-semibold text-[#258b76]">Score: {score}%</span>}
                    </div>
                    <div className="mt-5 space-y-4">
                        {quiz.questions.map((question, index) => {
                            const result = results?.find((item) => item.questionId === question.id);
                            return (
                                <fieldset key={question.id} className="rounded-xl border border-[#eeeaf2] bg-[#fcfbfd] p-4">
                                    <legend className="sr-only">Question {index + 1}</legend>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="text-sm font-semibold leading-5 text-[#342b53]">{index + 1}. {question.question}</p>
                                        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold capitalize ${difficultyStyles[question.difficulty]}`}>{question.difficulty}</span>
                                    </div>
                                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7157d9]">{question.topic}</p>
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        {question.options.map((option) => (
                                            <label key={option.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-5 transition ${result?.correctOptionId === option.id ? "border-[#258b76] bg-[#e8f8f4]" : result && answers[question.id] === option.id ? "border-[#b85268] bg-[#fce9ed]" : "border-[#e8e4ed] bg-white hover:border-[#7157d9]"}`}>
                                                <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} disabled={results !== null} className="mt-1 accent-[#7157d9]" />
                                                <span>{option.text}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {result && <p className="mt-3 text-xs leading-5 text-[#756b7f]"><span className="font-semibold text-[#342b53]">{result.isCorrect ? "Correct. " : "Review. "}</span>{result.explanation}</p>}
                                </fieldset>
                            );
                        })}
                    </div>
                    {results === null ? <button type="submit" disabled={isLoading} className="mt-5 rounded-lg bg-[#286e61] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50">{isLoading ? "Submitting..." : "Submit quiz"}</button> : <button type="button" onClick={() => { setQuiz(null); setResults(null); setScore(null); }} className="mt-5 rounded-lg border border-[#286e61] px-4 py-2.5 text-xs font-semibold text-[#286e61]">Generate another quiz</button>}
                </form>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg bg-[#fce9ed] px-3 py-2 text-xs text-[#a64259]">{error}</p>}
        </section>
    );
}