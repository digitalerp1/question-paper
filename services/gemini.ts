import { GoogleGenAI } from "@google/genai";
import { QuestionType, type FileData } from "../types";

// Helper to convert file to base64
export const fileToPart = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateQuestionsStream = async (
  apiKey: string,
  modelSelection: string,
  files: File[],
  prompt: string,
  count: number,
  type: QuestionType,
  onChunk: (text: string) => void
) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter your Google Gemini API Key.");
  }

  // Initialize AI with the user-provided key
  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare file parts
  const fileParts = await Promise.all(files.map(fileToPart));

  // Construct a robust prompt for specific formatting
  const formattingInstruction = `
    Task: Generate ${count} exam questions.
    Type: ${type}
    Topic: ${prompt}
    
    STRICT RULES:
    1. Output strictly pure Markdown.
    2. Use LaTeX wrapped in '$' for inline math.
    3. Start immediately with questions. No intro/outro text.
    4. Make it COMPACT.
    
    FORMAT (MCQ):
    **1.** Question text? **(A)** Opt1 **(B)** Opt2 **(C)** Opt3 **(D)** Opt4
    
    FORMAT (Subjective):
    **1.** Concise question text.
    
    ENSURE SPEED AND ACCURACY.
  `;

  // Determine the model
  let modelName = modelSelection;
  
  // If "auto" is selected, choose based on input type
  if (modelSelection === 'auto') {
    modelName = fileParts.length > 0 ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash';
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: {
        parts: [
          ...fileParts,
          { text: formattingInstruction }
        ]
      },
      config: {
        temperature: 0.3, 
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};