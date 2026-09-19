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
type TopicProgress = {
    topic: string;
    accuracy: number;
    strength: "Weak" | "Medium" | "Strong";
};

const difficultyStyles = {
    easy: "bg-[#e8f8f4] text-[#258b76]",
    medium: "bg-[#fff3df] text-[#ad712f]",
    hard: "bg-[#fce9ed] text-[#b85268]",
};

export default function QuizGenerator() {
    const currentUserId = process.env.NEXT_PUBLIC_CURRENT_USER_ID;
    const defaultDocumentId = process.env.NEXT_PUBLIC_CURRENT_DOCUMENT_ID ?? "";
    const [sourceType, setSourceType] = useState<"document" | "topic">(defaultDocumentId ? "document" : "topic");
    const [documentId, setDocumentId] = useState(defaultDocumentId);
    const [topic, setTopic] = useState("");
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<QuizResult[] | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function generateQuiz(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setQuiz(null);
        setResults(null);
        setScore(null);
        setTopicProgress([]);

        if (!currentUserId || (sourceType === "document" && !documentId) || (sourceType === "topic" && !topic.trim())) {
            setError("Configure a current user and choose a document or topic before generating a quiz.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/quizzes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUserId,
                    documentId: sourceType === "document" ? documentId : undefined,
                    topic: sourceType === "topic" ? topic : undefined,
                }),
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
            setTopicProgress(data.topicProgress ?? []);
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
                <p className="mt-1 text-[12px] text-[#938c9c]">Generate a multiple-choice quiz from a saved document or topic.</p>
            </div>

            {!quiz && (
                <form onSubmit={generateQuiz} className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                    <label className="text-xs font-semibold text-[#5d5665]">
                        Source
                        <select value={sourceType} onChange={(event) => setSourceType(event.target.value as "document" | "topic")} className="mt-2 w-full rounded-lg border border-[#e8e4ed] bg-[#fcfbfd] px-3 py-2.5 text-xs font-normal outline-none focus:border-[#7157d9]">
                            <option value="document">Document</option>
                            <option value="topic">Topic</option>
                        </select>
                    </label>
                    {sourceType === "document" ? (
                        <label className="text-xs font-semibold text-[#5d5665]">
                            Document ID
                            <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} placeholder="Document UUID" className="mt-2 w-full rounded-lg border border-[#e8e4ed] bg-[#fcfbfd] px-3 py-2.5 text-xs font-normal outline-none focus:border-[#7157d9]" />
                        </label>
                    ) : (
                        <label className="text-xs font-semibold text-[#5d5665]">
                            Topic
                            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. neural networks" className="mt-2 w-full rounded-lg border border-[#e8e4ed] bg-[#fcfbfd] px-3 py-2.5 text-xs font-normal outline-none focus:border-[#7157d9]" />
                        </label>
                    )}
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
                    {results === null ? <button type="submit" disabled={isLoading} className="mt-5 rounded-lg bg-[#286e61] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50">{isLoading ? "Submitting..." : "Submit quiz"}</button> : <button type="button" onClick={() => { setQuiz(null); setResults(null); setScore(null); setTopicProgress([]); }} className="mt-5 rounded-lg border border-[#286e61] px-4 py-2.5 text-xs font-semibold text-[#286e61]">Generate another quiz</button>}
                    {topicProgress.length > 0 && (
                        <section className="mt-6 border-t border-[#eeeaf2] pt-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a29caf]">Learning analytics</p>
                                    <h4 className="mt-1 text-sm font-semibold">Topic strength</h4>
                                </div>
                                <span className="text-[11px] text-[#938c9c]">Based on all submitted answers</span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {topicProgress.map((progress) => (
                                    <div key={progress.topic} className="rounded-lg border border-[#eeeaf2] bg-white px-3 py-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-semibold text-[#342b53]">{progress.topic}</span>
                                            <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${progress.strength === "Strong" ? "bg-[#e8f8f4] text-[#258b76]" : progress.strength === "Weak" ? "bg-[#fce9ed] text-[#b85268]" : "bg-[#fff3df] text-[#ad712f]"}`}>{progress.strength}</span>
                                        </div>
                                        <p className="mt-2 text-[11px] text-[#938c9c]">{Math.round(progress.accuracy)}% accuracy</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </form>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg bg-[#fce9ed] px-3 py-2 text-xs text-[#a64259]">{error}</p>}
        </section>
    );
}