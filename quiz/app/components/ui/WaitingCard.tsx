import React, { useState } from "react";
import { User, Copy, CheckCircle } from "lucide-react";

interface WaitingCardProps {
  roomId: string;
  roomName?: string;
  currentPlayers: number;
  maxPlayers: number;
  participants?: Array<{
    id: string;
    username: string;
  }>;
}

const WaitingCard: React.FC<WaitingCardProps> = ({
  roomId,
  roomName,
  currentPlayers,
  maxPlayers,
  participants = [],
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-[448px] bg-gradient-to-b from-gray-950 to-black rounded-xl shadow-2xl border border-gray-800">
      <header className="px-6 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg text-white tracking-tight">
              {roomName || "Waiting Room"}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Session preparation
            </p>
          </div>
          <div className="flex items-center bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
            <span className="text-sm font-medium text-gray-300">
              {currentPlayers}/{maxPlayers}
            </span>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-400">Room ID</span>
              <span className="text-sm font-mono text-gray-200">{roomId}</span>
            </div>
            <button 
              onClick={handleCopyRoomId} 
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-all"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-gray-400">Participants</h3>
            <span className="text-xs text-gray-500">
              {maxPlayers - participants.length} slots remaining
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center bg-gray-900 px-3 py-2.5 rounded-lg border border-gray-800"
              >
                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-200 truncate">
                  {participant.username}
                </span>
              </div>
            ))}

            {participants.length < maxPlayers &&
              Array.from({ length: maxPlayers - participants.length }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center bg-gray-900/50 px-3 py-2.5 rounded-lg border border-gray-800/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <span className="ml-2 text-sm text-gray-500 font-medium">
                      Available
                    </span>
                  </div>
                )
              )}
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">
            Waiting for players to join
          </span>
        </div>
      </footer>
    </div>
  );
};

export default WaitingCard;