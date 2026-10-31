/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `timeLimit` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the `GameParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `duration` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GameParticipant" DROP CONSTRAINT "GameParticipant_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "GameParticipant" DROP CONSTRAINT "GameParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "GameQuestion" DROP CONSTRAINT "GameQuestion_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_roomId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantAnswer" DROP CONSTRAINT "ParticipantAnswer_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_categoryId_fkey";

-- DropIndex
DROP INDEX "Room_categoryId_idx";

-- DropIndex
DROP INDEX "Room_code_key";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "categoryId",
DROP COLUMN "code",
DROP COLUMN "isPrivate",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "timeLimit",
ADD COLUMN     "duration" INTEGER NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "quizCategoryId" TEXT,
ADD COLUMN     "quizTopic" TEXT,
ADD COLUMN     "roomTimeLimit" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "maxParticipants" SET DEFAULT 2,
ALTER COLUMN "difficulty" SET DEFAULT 'EASY';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 1;

-- DropTable
DROP TABLE "GameParticipant";

-- DropTable
DROP TABLE "GameSession";

-- CreateTable
CREATE TABLE "RoomParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_id_key" ON "Room"("id");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_quizCategoryId_fkey" FOREIGN KEY ("quizCategoryId") REFERENCES "QuizCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
