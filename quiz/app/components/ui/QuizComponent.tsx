import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Timer, CheckCircle, XCircle } from "lucide-react";
import { useSocketStore } from "@/store/socketStore";

interface QuizComponentProps {
  question: {
    id: string;
    questionText: string;
    options: string[];
    timeLimit: number;
    difficulty?: string;
  };
  onAnswer: (selectedOption: number) => void;
  currentQuestionIndex: number;
  totalQuestions: number;
  initialTimeLeft?: number;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  question,
  onAnswer,
  currentQuestionIndex,
  totalQuestions,
  initialTimeLeft,
}) => {
  const { socket } = useSocketStore();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLeft || question.timeLimit);
  const [answered, setAnswered] = useState<boolean>(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctOption: number;
    pointsEarned: number;
  } | null>(null);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    // Make sure we're always starting with the full time limit
    setTimeLeft(initialTimeLeft !== undefined ? initialTimeLeft : question.timeLimit);
    setAnswered(false);
  }, [question, initialTimeLeft]);

  // Listen for next question event and time updates
  useEffect(() => {
    if (!socket) return;

    const handleNextQuestion = (data: { questionIndex: number, timeLeft: number }) => {
      if (data.questionIndex === currentQuestionIndex + 1) {
        setSelectedOption(null);
        setTimeLeft(data.timeLeft);
        setAnswered(false);
      }
    };

    const handleTimeUpdate = (data: { questionIndex: number, timeLeft: number }) => {
      if (data.questionIndex === currentQuestionIndex && !answered) {
        // Always trust the server time updates for better synchronization
        setTimeLeft(data.timeLeft);
      }
    };

    socket.on("nextQuestion", handleNextQuestion);
    socket.on("timeUpdate", handleTimeUpdate);

    return () => {
      socket.off("nextQuestion", handleNextQuestion);
      socket.off("timeUpdate", handleTimeUpdate);
    };
  }, [socket, currentQuestionIndex, answered]);

  // Only use local timer as fallback if server updates aren't coming
  // and with lower priority than server updates
  useEffect(() => {
    // If we've already answered or the timer is up, don't run the local timer
    if (timeLeft <= 0 || answered) return;

    // Local timer is less frequent and just a fallback
    const timer = setTimeout(() => {
      // Only update if we haven't received a server update recently
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 0.5); // Decrease by half a second
        if (newTime <= 0 && !answered) {
          setAnswered(true);
          onAnswer(-1); // -1 indicates no answer was selected
        }
        return newTime;
      });
    }, 1100); // Slightly longer than server's update frequency to avoid racing

    return () => clearTimeout(timer);
  }, [timeLeft, answered, onAnswer]);

  // Listen for question results to show feedback
  useEffect(() => {
    if (!socket) return;
    
    const handleQuestionResults = (data: {
      questionIndex: number;
      correctOption: number;
      participantAnswers: any[];
      isLastQuestion: boolean;
    }) => {
      if (data.questionIndex === currentQuestionIndex) {
        // If this is the last question, no need to reset for the next question
        if (data.isLastQuestion) {
          console.log("Last question completed, waiting for final results");
        }
      }
    };
    
    socket.on("questionResults", handleQuestionResults);
    
    return () => {
      socket.off("questionResults", handleQuestionResults);
    };
  }, [socket, currentQuestionIndex]);

  // Listen for answer feedback
  useEffect(() => {
    if (!socket) return;

    const handleAnswerFeedback = (data: {
      questionIndex: number;
      selectedOption: number;
      isCorrect: boolean;
      correctOption: number;
      pointsEarned: number;
    }) => {
      if (data.questionIndex === currentQuestionIndex) {
        // Show feedback for the current answer
        setAnswerFeedback({
          isCorrect: data.isCorrect,
          correctOption: data.correctOption,
          pointsEarned: data.pointsEarned
        });
      }
    };
    
    socket.on("answerFeedback", handleAnswerFeedback);
    
    return () => {
      socket.off("answerFeedback", handleAnswerFeedback);
    };
  }, [socket, currentQuestionIndex]);

  const handleOptionSelect = (index: number) => {
    if (answered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || answered) return;
    
    setAnswered(true);
    onAnswer(selectedOption);
  };

  // Calculate progress percentage
  const progressPercentage = (timeLeft / question.timeLimit) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Question header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-200">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </h3>
          <div className="mt-1 text-sm text-gray-400">
            {answered ? 'Waiting for other players...' : 'Select the correct answer'}
            {question.difficulty && <span className="ml-2 px-2 py-0.5 bg-blue-900 rounded-full text-xs font-medium text-blue-200">{question.difficulty}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-blue-400" />
          <span className={`font-mono font-medium ${timeLeft <= 5 ? 'text-red-400' : 'text-blue-400'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          {question.questionText}
        </h2>
      </div>

      {/* Points earned feedback */}
      {answered && answerFeedback && (
        <div className={`mb-6 p-4 rounded-lg ${answerFeedback.isCorrect ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          {answerFeedback.isCorrect ? (
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              <div>
                <span className="text-green-400 font-medium">Correct!</span>
                <span className="text-gray-300 ml-2">You earned <span className="font-bold text-green-400">10 points</span></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <XCircle className="w-5 h-5 mr-2 text-red-400" />
              <div>
                <span className="text-red-400 font-medium">Incorrect.</span>
                <span className="text-gray-300 ml-2">The correct answer was: <span className="font-medium text-white">{question.options[answerFeedback.correctOption]}</span></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Answer options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {question.options.map((option, index) => {
          // Determine the style based on answer status
          let optionClassName = "p-4 border rounded-lg transition-all duration-200 ";
          
          if (answered) {
            if (answerFeedback) {
              if (index === answerFeedback.correctOption) {
                // Correct answer
                optionClassName += "bg-green-900/30 border-green-600 text-green-400";
              } else if (index === selectedOption && !answerFeedback.isCorrect) {
                // Selected but incorrect
                optionClassName += "bg-red-900/30 border-red-600 text-red-400";
              } else {
                // Not selected
                optionClassName += "bg-gray-800/50 border-gray-700 text-gray-400";
              }
            } else if (index === selectedOption) {
              // Selected but no feedback yet
              optionClassName += "bg-blue-900/30 border-blue-600 text-blue-400";
            } else {
              // Not selected
              optionClassName += "bg-gray-800/50 border-gray-700 text-gray-400";
            }
          } else {
            // Not answered yet
            optionClassName += index === selectedOption
              ? "bg-blue-900/30 border-blue-600 text-blue-400"
              : "bg-gray-800/50 border-gray-700 hover:border-blue-600 hover:bg-blue-900/20 cursor-pointer text-gray-300";
          }

          return (
            <div
              key={index}
              className={optionClassName}
              onClick={() => handleOptionSelect(index)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 mr-3 flex items-center justify-center">
                  {answered && answerFeedback && index === answerFeedback.correctOption && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {answered && answerFeedback && index === selectedOption && !answerFeedback.isCorrect && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  {(!answered || !answerFeedback || (index !== answerFeedback.correctOption && !(index === selectedOption && !answerFeedback.isCorrect))) && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === selectedOption ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                  )}
                </div>
                <div className="mt-0.5">{option}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={selectedOption === null || answered}
          className={`px-8 py-2 rounded-full transition-all ${
            selectedOption === null || answered
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/20"
          }`}
        >
          {answered ? "Submitted" : "Submit Answer"}
        </Button>
      </div>
    </div>
  );
};

export default QuizComponent; 