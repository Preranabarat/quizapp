import { Trophy, User } from "lucide-react";
import { formatRelativeTime } from "../utils/dateUtils";

interface Participant {
  id: string;
  name: string;
  score: number;
  isCurrentUser: boolean;
  result: "win" | "loss" | "tie";
}

interface GameHistoryProps {
  game: {
    id: string;
    topic: string;
    date: string;
    participants?: Participant[];
    currentUserResult?: "win" | "loss" | "tie";
    userScore?: number;
    // For backward compatibility
    opponent?: string;
    result?: "win" | "loss" | "tie";
    score?: string;
    opponentScore?: string;
  };
}

export function GameHistoryCard({ game }: GameHistoryProps) {
  // Get result label and styling consistently
  const getResultInfo = (result: "win" | "loss" | "tie") => {
    switch (result) {
      case "win":
        return {
          label: "Victory",
          bgColor: "bg-green-500/10",
          textColor: "text-green-500",
          iconColor: "text-green-500"
        };
      case "loss":
        return {
          label: "Defeat",
          bgColor: "bg-red-500/10",
          textColor: "text-red-500", 
          iconColor: "text-red-500"
        };
      case "tie":
        return {
          label: "Tie",
          bgColor: "bg-yellow-500/10",
          textColor: "text-yellow-500",
          iconColor: "text-yellow-500"
        };
      default:
        return {
          label: "Unknown",
          bgColor: "bg-zinc-500/10",
          textColor: "text-zinc-500",
          iconColor: "text-zinc-500"
        };
    }
  };

  // Use currentUserResult if available, otherwise fall back to result
  const resultToUse = game.currentUserResult || game.result || "loss";
  const { label, bgColor, textColor, iconColor } = getResultInfo(resultToUse);
  
  // Find winners (participants with 'win' result)
  const winners = game.participants?.filter(p => p.result === "win") || [];

  return (
    <div className="flex flex-col rounded-lg bg-zinc-800/30 p-4 transition-colors hover:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className={`rounded-full ${bgColor} p-2`}>
            <Trophy className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-zinc-200">
                {game.topic} Quiz
              </p>
              <span className={`rounded-full ${bgColor} px-2 py-1 text-xs font-medium ${textColor}`}>
                {label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-sm text-zinc-500">{formatRelativeTime(game.date)}</span>
      </div>
      
      {/* Participants list */}
      {game.participants && game.participants.length > 0 ? (
        <div className="pl-10">
          {winners.length > 0 && (
            <p className="text-xs text-zinc-400 mb-2">
              {winners.length === 1 
                ? `Winner: ${winners[0].name} (${winners[0].score} points)` 
                : `Tie between ${winners.map(w => w.name).join(', ')}`}
            </p>
          )}
          <div className="space-y-1">
            {game.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-zinc-400" />
                  <p className={`text-sm ${participant.isCurrentUser ? "font-medium text-zinc-200" : "text-zinc-400"}`}>
                    {participant.name} {participant.isCurrentUser ? "(You)" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400">{participant.score} points</p>
                  {participant.result === "win" && (
                    <span className="text-xs text-green-500">Winner</span>
                  )}
                  {participant.result === "tie" && (
                    <span className="text-xs text-yellow-500">Tied</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Fallback to old format if participants array is not available
        <div className="pl-10">
          <p className="text-sm text-zinc-400">
            Your score: {game.score} • Opponent: {game.opponentScore}
          </p>
        </div>
      )}
    </div>
  );
}