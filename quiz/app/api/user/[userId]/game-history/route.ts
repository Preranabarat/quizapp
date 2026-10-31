import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = await params;

    console.log(`Fetching game history for user: ${userId}`);

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      console.log(`User ${userId} not found`);
      return NextResponse.json({ games: [] });
    }

    // Get all rooms where the user has participated
    const rooms = await prisma.room.findMany({
      where: {
        status: "FINISHED",
        OR: [
          { participants: { some: { userId } } },
          { hostId: userId }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        QuizCategory: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${rooms.length} completed games for user ${userId}`);

    // For each room, get all participant answers
    const games = await Promise.all(rooms.map(async (room) => {
      // Get all participants including the current user
      const allParticipantIds = room.participants.map(p => p.userId);
      
      // Add host if not already in participants
      if (!allParticipantIds.includes(room.hostId)) {
        allParticipantIds.push(room.hostId);
      }
      
      // Get scores for all participants
      const participantScores = await Promise.all(allParticipantIds.map(async (participantId) => {
        const answers = await prisma.participantAnswer.findMany({
          where: {
            participantId,
            question: {
              gameSessionId: room.id
            }
          }
        });
        
        const score = answers.reduce((total, answer) => 
          total + (answer.isCorrect ? answer.pointsEarned : 0), 0);
        
        // Get participant name - either from participants or host
        let name;
        const participant = room.participants.find(p => p.userId === participantId);
        if (participant) {
          name = participant.user.name;
        } else if (participantId === room.hostId) {
          name = room.host.name;
        } else {
          name = "Unknown Player";
        }
        
        return {
          id: participantId,
          name,
          score,
          isCurrentUser: participantId === userId
        };
      }));
      
      // Sort by score in descending order to find the winner
      participantScores.sort((a, b) => b.score - a.score);
      
      // Find highest score
      const highestScore = participantScores.length > 0 ? participantScores[0].score : 0;
      
      // Mark winners (could be multiple with same score)
      const participantsWithResults = participantScores.map(participant => {
        let result;
        if (participant.score === highestScore) {
          // If there's only one participant with the highest score, they're the winner
          // If multiple participants have the highest score, it's a tie
          const playersWithHighScore = participantScores.filter(p => p.score === highestScore);
          result = playersWithHighScore.length === 1 ? "win" : "tie";
        } else {
          // Anyone not with the highest score has lost
          result = "loss";
        }
        
        return {
          ...participant,
          result
        };
      });
      
      // Find the current user's result
      const currentUserParticipant = participantsWithResults.find(p => p.isCurrentUser);
      
      return {
        id: room.id,
        topic: room.QuizCategory?.name || room.quizTopic || "General Knowledge",
        date: room.updatedAt.toISOString(),
        participants: participantsWithResults,
        currentUserResult: currentUserParticipant?.result || "loss",
        userScore: currentUserParticipant?.score || 0,
        // Keep these fields for backward compatibility with existing code
        opponent: participantsWithResults.filter(p => !p.isCurrentUser)[0]?.name || "Solo Game",
        result: currentUserParticipant?.result || "loss",
        score: `${currentUserParticipant?.score || 0} points`,
        opponentScore: `${participantsWithResults.filter(p => !p.isCurrentUser)[0]?.score || 0} points`
      };
    }));

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error fetching game history:", error);
    return NextResponse.json({ games: [] });
  }
}