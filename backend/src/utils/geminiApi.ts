import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in your environment variables');
}

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

interface McqQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  timeLimit: number;
  difficulty: string;
}

export async function generateMcqs(topic: string, count: number, difficulty: string = 'MEDIUM'): Promise<McqQuestion[]> {
  const difficultyLevel = difficulty.toUpperCase();
  console.log(`Generating ${count} MCQs about ${topic} with ${difficultyLevel} difficulty using Gemini API`);

  const modelNames = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
  let lastError: unknown;
  
  for (const modelName of modelNames) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Configure safety settings - setting to low to ensure creative question generation
      const generationConfig = {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      };
      
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
      ];
      
      const prompt = `Generate ${count} multiple choice questions about ${topic} with ${difficultyLevel} difficulty level. 
      Each question should have exactly 4 options with one correct answer.
      The format should be a JSON array with objects having this structure:
      {
        "questionText": "The question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctOption": 0-based index of the correct option (0, 1, 2, or 3)
      }
      Important: 
      - Return ONLY the JSON array with no additional text
      - Each question should match the ${difficultyLevel} difficulty level
      - Questions must be distinct and cover different concepts or question styles
      - Do not repeat or rephrase the same question
      - The correct answer index must be accurate (0-3)
      - Do not include any explanations or introductions outside the JSON`;
      
      console.log(`Making request to Gemini API with model: ${modelName}`);
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings
      });
      
      const response = result.response;
      const responseText = response.text();
      
      console.log('Received response from Gemini API');
      
      // Extract JSON array from the response
      let jsonText = responseText;
      // Sometimes the API adds backticks to format as code
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }
      
      console.log('Parsing response...');
      const questions = JSON.parse(jsonText);
      
      console.log(`Successfully parsed ${questions.length} questions`);

      if (!Array.isArray(questions) || questions.length !== count) {
        throw new Error(`Expected ${count} questions, received ${Array.isArray(questions) ? questions.length : "invalid response"}`);
      }

      const seenQuestions = new Set<string>();
      return questions.map((q: any, index: number) => {
        const questionText = typeof q?.questionText === "string" ? q.questionText.trim() : "";
        const normalizedQuestion = questionText.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!questionText || !normalizedQuestion || seenQuestions.has(normalizedQuestion)) {
          throw new Error(`Question ${index + 1} is empty or duplicates another question`);
        }
        seenQuestions.add(normalizedQuestion);

        if (
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          q.options.some((option: unknown) => typeof option !== "string" || !option.trim()) ||
          !Number.isInteger(q.correctOption) ||
          q.correctOption < 0 ||
          q.correctOption > 3
        ) {
          throw new Error(`Question ${index + 1} has invalid answer options`);
        }

        return {
          id: `gemini-q${index + 1}`,
          questionText,
          options: q.options,
          correctOption: q.correctOption,
          timeLimit: 30,
          difficulty: difficultyLevel
        };
      });
    } catch (error) {
      lastError = error;
      console.error(`Error with model ${modelName}:`, error);
      // Continue to the next model if this one fails
    }
  }
  
  console.error('All Gemini API models failed');
  const detail = lastError instanceof Error ? lastError.message : "Unknown generation error";
  throw new Error(`Unable to generate quiz questions: ${detail}`);
} 