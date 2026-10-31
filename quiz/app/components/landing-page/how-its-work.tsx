import React from "react";
import { Gamepad2, Users, Trophy } from "lucide-react";
import { MagicCard } from "../ui/magic-card";

const HowItsWork = () => {
  return (
    <div className="min-h-full flex flex-col items-center justify-start p-4 md:p-8">
      <div className="inline-block border border-emerald-500/20 px-4 py-1.5 rounded-full text-sm bg-emerald-500/10 text-emerald-300 font-medium">
        How its works
      </div>

      {/* Enhanced Heading Section */}
      <div className="text-center max-w-2xl mx-auto mt-8 mb-12">
        <h2 className="text-3xl myfont2 md:text-4xl text-white font-extrabold">
          Master the Quiz Arena
        </h2>
        <p className="mt-4 myfont2 text-gray-400 text-sm md:text-lg">
          Play, compete, and dominate in three simple steps
        </p>
      </div>

      {/* How it Works Cards */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-6xl ">
        {[
          {
            icon: (
              <Gamepad2 className="w-10 h-10 md:w-12 md:h-12 text-emerald-400" />
            ),
            title: "Create Room",
            description:
              "Set up your battle room and invite friends to join the quiz challenge",
          },
          {
            icon: <Users className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />,
            title: "Challenge Friends",
            description:
              "Invite your friends and compete in real-time quiz battles",
          },
          {
            icon: (
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-yellow-400" />
            ),
            title: "Win Battles",
            description:
              "Score points, climb the leaderboard, and become the quiz champion",
          },
        ].map((card, index) => (
          <MagicCard
            key={index}
            className="flex-1 border border-zinc-800 p-6 md:p-10 group hover:scale-105 transition-transform duration-300"
            gradientColor={"#D9D9D955"}
          >
            <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
              {card.icon}
              <h3 className="text-lg md:text-xl font-bold text-white">
                {card.title}
              </h3>
              <p className="text-sm md:text-base text-gray-400">
                {card.description}
              </p>
            </div>
          </MagicCard>
        ))}
      </div>
    </div>
  );
};

export default HowItsWork;
