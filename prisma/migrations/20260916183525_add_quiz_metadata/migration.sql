/*
  Warnings:

  - Added the required column `difficulty` to the `QuizQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `QuizQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "difficulty" "FlashcardDifficulty" NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL;
