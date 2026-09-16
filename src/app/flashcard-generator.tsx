"use client";

import { FormEvent, useState } from "react";
import type { Flashcard } from "@/lib/flashcards";

const difficultyStyles = {
    easy: "bg-[#e8f8f4] text-[#258b76]",
    medium: "bg-[#fff3df] text-[#ad712f]",
    hard: "bg-[#fce9ed] text-[#b85268]",
};

export default function FlashcardGenerator() {
    const currentUserId = process.env.NEXT_PUBLIC_CURRENT_USER_ID;
    const currentDocumentId = process.env.NEXT_PUBLIC_CURRENT_DOCUMENT_ID;
    const [notes, setNotes] = useState("");
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setFlashcards([]);
        setIsGenerating(true);

        try {
            const response = await fetch("/api/flashcards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notes,
                    userId: currentUserId,
                    documentId: currentDocumentId,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Unable to generate flashcards.");
            }

            setFlashcards(data.flashcards);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to generate flashcards. Please try again.",
            );
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <section className="mt-8 rounded-[20px] border border-[#ece9f1] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a29caf]">
                        AI study tools
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                        Turn your notes into flashcards
                    </h2>
                    <p className="mt-1 text-[12px] text-[#938c9c]">
                        Paste a topic, lecture, or chapter summary to get started.
                    </p>
                </div>
                {flashcards.length > 0 && (
                    <span className="rounded-md bg-[#eeeafd] px-2.5 py-1 text-[10px] font-semibold text-[#694ed0]">
                        {flashcards.length} cards generated
                    </span>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
                <label htmlFor="study-notes" className="sr-only">
                    Study notes
                </label>
                <textarea
                    id="study-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Paste your study notes here..."
                    disabled={isGenerating}
                    className="min-h-32 w-full resize-y rounded-xl border border-[#e8e4ed] bg-[#fcfbfd] p-4 text-sm leading-6 text-[#26232f] outline-none transition focus:border-[#7157d9] focus:ring-2 focus:ring-[#eeeafd] disabled:cursor-wait disabled:opacity-70"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-[#a09aa7]">{notes.length}/30,000 characters</span>
                    <button
                        type="submit"
                        disabled={isGenerating || notes.trim().length < 20}
                        className="rounded-lg bg-[#7157d9] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_7px_14px_rgba(113,87,217,0.2)] transition hover:bg-[#6248c8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isGenerating ? "Generating..." : "Generate flashcards"}
                    </button>
                </div>
            </form>

            {error && (
                <p role="alert" className="mt-4 rounded-lg bg-[#fce9ed] px-3 py-2 text-xs text-[#a64259]">
                    {error}
                </p>
            )}

            {flashcards.length > 0 && (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {flashcards.map((flashcard, index) => (
                        <article key={`${flashcard.question}-${index}`} className="rounded-xl border border-[#eeeaf2] bg-[#fcfbfd] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a29caf]">
                                    Card {index + 1}
                                </span>
                                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold capitalize ${difficultyStyles[flashcard.difficulty]}`}>
                                    {flashcard.difficulty}
                                </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold leading-5 text-[#342b53]">{flashcard.question}</p>
                            <p className="mt-2 text-[13px] leading-5 text-[#756b7f]">{flashcard.answer}</p>
                            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7157d9]">{flashcard.topic}</p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}