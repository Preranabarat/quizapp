import React, { useState, useEffect, useRef } from "react";
import QuizComponent from "./QuizComponent";
import { useSocketStore } from "@/store/socketStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Button } from "./button";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  timeLimit: number;
}

interface QuizSessionProps {
  roomId: string;
}

const QuizSession: React.FC<QuizSessionProps> = ({ roomId }) => {
  const { socket } = useSocketStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    console.log("Setting up socket listeners for quiz in room:", roomId);
    
    // Immediately request questions if we're joining a game that might be in progress
    socket.emit("requestQuizQuestions", roomId);
    
    // Listen for quiz start event
    socket.on("quizStart", (quizData: { 
      questions: Question[], 
      currentQuestionIndex: number,
      timeLeft: number 
    }) => {
      console.log("Quiz started with questions:", quizData);
      if (quizData && quizData.questions && quizData.questions.length > 0) {
        setQuestions(quizData.questions);
        setCurrentQuestionIndex(quizData.currentQuestionIndex);
        setTimeLeft(quizData.timeLeft);
        setQuizStarted(true);
        setIsReconnecting(false);
        
        // Clear waiting timer if it exists
        if (waitingTimerRef.current) {
          clearInterval(waitingTimerRef.current);
          waitingTimerRef.current = null;
        }
      } else {
        console.error("Received invalid quiz data:", quizData);
      }
    });

    // Listen for next question event
    socket.on("nextQuestion", (data: { questionIndex: number, timeLeft: number }) => {
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.timeLeft);
    });

    // Listen for quiz results
    socket.on("quizResults", (resultsData) => {
      console.log("Quiz results received:", resultsData);
      setResults(resultsData);
      setQuizEnded(true);
      
      // Start countdown for redirect (10 seconds)
      setRedirectCountdown(10);
      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(redirectTimerRef.current!);
            router.push('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });
    
    // Listen for individual question results
    socket.on("questionResults", (resultData) => {
      console.log("Question result:", resultData);
      // You can use this to show feedback between questions
    });

    // Listen for game start event
    socket.on("gameStart", () => {
      console.log("Game started in room:", roomId);
      // Immediately request the quiz questions as soon as we know the game has started
      socket.emit("requestQuizQuestions", roomId);
    });

    // Start a timer to track how long we've been waiting
    waitingTimerRef.current = setInterval(() => {
      setWaitingTime(prev => {
        // Request questions if we've been waiting for 2 seconds
        if (prev === 2 && !quizStarted) {
          console.log("Requesting quiz questions after 2 seconds");
          socket.emit("requestQuizQuestions", roomId);
        }
        // Try again if we've been waiting for 5 seconds
        else if (prev === 5 && !quizStarted) {
          console.log("Requesting quiz questions again after 5 seconds");
          socket.emit("requestQuizQuestions", roomId);
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("quizStart");
      socket.off("nextQuestion");
      socket.off("quizResults");
      socket.off("questionResults");
      
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
      
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [socket, roomId, quizStarted, router]);

  // Request quiz questions if we've been waiting too long
  useEffect(() => {
    if (waitingTime > 10 && !quizStarted && socket) {
      console.log("Still waiting for questions after 10 seconds, requesting again");
      socket.emit("requestQuizQuestions", roomId);
      setWaitingTime(0); // Reset timer to avoid spamming requests
    }
  }, [waitingTime, quizStarted, socket, roomId]);

  const handleAnswer = (selectedOption: number) => {
    console.log(`Submitting answer: ${selectedOption} for question ${currentQuestionIndex}`);
    
    // Store the answer
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setAnswers(newAnswers);

    // Send answer to server with user ID
    if (socket && session?.user?.id) {
      socket.emit("submitAnswer", {
        roomId,
        questionIndex: currentQuestionIndex,
        selectedOption,
        userId: session.user.id
      });
    }
  };

  const handleGoToDashboard = () => {
    if (redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    router.push('/dashboard');
  };

  if (!quizStarted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-medium text-white mb-2">
            Preparing Quiz...
          </h3>
          <p className="text-gray-400">
            The quiz will start automatically when ready
          </p>
          {waitingTime > 5 && (
            <button 
              onClick={() => socket?.emit("requestQuizQuestions", roomId)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Request Questions
            </button>
          )}
        </div>
      </div>
    );
  }

  if (quizEnded && results && (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl border border-gray-800 p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Quiz Results</h2>
        
        {results ? (
          <div className="space-y-6">
            {/* Winner Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              {results.winners && results.winners.length > 0 && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Winner!</h3>
                  <p className="text-2xl font-bold text-yellow-400 mb-1">
                    {results.winners[0]?.username}
                  </p>
                  <p className="text-gray-300">
                    with {results.winners[0]?.score} points
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-lg text-gray-300">
              Your Score: <span className={results.winners && results.winners.some((w: any) => w.id === session?.user?.id) ? "text-yellow-400 font-bold" : "text-white font-bold"}>
                {results.participants?.find((p: any) => p.id === session?.user?.id)?.score || 0} points
              </span>
              <span className="text-gray-500 text-sm ml-2">
                ({questions.length} questions)
              </span>
            </p>
            
            <div className="mt-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Leaderboard</h3>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">Player</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.participants?.map((participant: any, index: number) => (
                      <tr 
                        key={participant.id} 
                        className={`${
                          participant.id === session?.user?.id 
                            ? "bg-blue-900/30" 
                            : index % 2 === 0 ? "bg-gray-800/30" : "bg-gray-800/10"
                        } ${
                          results.winners && results.winners.some((w: any) => w.id === participant.id)
                            ? "border-l-2 border-yellow-500"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-sm font-medium text-gray-300">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-300 flex items-center">
                          {participant.id === session?.user?.id && (
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          )}
                          {participant.username}
                          {results.winners && results.winners.some((w: any) => w.id === participant.id) && (
                            <Trophy className="h-4 w-4 text-yellow-500 ml-2" />
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm font-medium text-right text-gray-300">
                          {participant.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <p className="text-sm text-gray-400 mb-3">
                Redirecting to dashboard in {redirectCountdown} seconds
              </p>
              <Button 
                onClick={handleGoToDashboard}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-full transition-all shadow-lg hover:shadow-blue-500/20"
              >
                Go to Dashboard Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Loading results...</p>
          </div>
        )}
      </div>
    </div>
  )) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl border border-gray-800 p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Quiz Complete!</h2>
          
          {results ? (
            <div className="space-y-6">
              {/* Winner Section */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                {results.winners && results.winners.length > 0 && (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Winner!</h3>
                    <p className="text-2xl font-bold text-yellow-400 mb-1">
                      {results.winners[0]?.username}
                    </p>
                    <p className="text-gray-300">
                      with {results.winners[0]?.score} points
                    </p>
                  </div>
                )}
              </div>
              
              <p className="text-lg text-gray-300">
                Your Score: <span className={results.winners && results.winners.some((w: any) => w.id === session?.user?.id) ? "text-yellow-400 font-bold" : "text-white font-bold"}>
                  {results.participants?.find((p: any) => p.id === session?.user?.id)?.score || 0} points
                </span>
                <span className="text-gray-500 text-sm ml-2">
                  ({questions.length} questions)
                </span>
              </p>
              
              <div className="mt-6 mb-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Leaderboard</h3>
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">Player</th>
                        <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.participants?.map((participant: any, index: number) => (
                        <tr 
                          key={participant.id} 
                          className={`${
                            participant.id === session?.user?.id 
                              ? "bg-blue-900/30" 
                              : index % 2 === 0 ? "bg-gray-800/30" : "bg-gray-800/10"
                          } ${
                            results.winners && results.winners.some((w: any) => w.id === participant.id)
                              ? "border-l-2 border-yellow-500"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-sm font-medium text-gray-300">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-300 flex items-center">
                            {participant.id === session?.user?.id && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            )}
                            {participant.username}
                            {results.winners && results.winners.some((w: any) => w.id === participant.id) && (
                              <Trophy className="h-4 w-4 text-yellow-500 ml-2" />
                            )}
                          </td>
                          <td className="py-3 px-3 text-sm font-medium text-right text-gray-300">
                            {participant.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <p className="text-sm text-gray-400 mb-3">
                  Redirecting to dashboard in {redirectCountdown} seconds
                </p>
                <Button 
                  onClick={handleGoToDashboard}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-full transition-all shadow-lg hover:shadow-blue-500/20"
                >
                  Go to Dashboard Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading results...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-4">
      {questions.length > 0 && currentQuestionIndex < questions.length && timeLeft !== null && (
        <QuizComponent
          question={questions[currentQuestionIndex]}
          onAnswer={handleAnswer}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          initialTimeLeft={timeLeft}
        />
      )}
    </div>
  );
};

export default QuizSession; 