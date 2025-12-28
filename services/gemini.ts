import { GoogleGenAI } from "@google/genai";
import { QuestionType, type FileData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  files: File[],
  prompt: string,
  count: number,
  type: QuestionType,
  onChunk: (text: string) => void
) => {
  
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

  // Use 'gemini-2.5-flash-image' for multimodal inputs (images/PDFs)
  // Use 'gemini-2.5-flash' for text-only inputs for MAXIMUM SPEED
  const modelName = fileParts.length > 0 ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash';

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