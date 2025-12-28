export const QuestionType = {
  OBJECTIVE: 'Objective (MCQ)',
  SUBJECTIVE: 'Subjective (Long Answer)',
  MIXED: 'Mixed (Objective & Subjective)'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export interface AppState {
  files: File[];
  prompt: string;
  questionCount: number;
  questionType: QuestionType;
  generatedContent: string;
  isGenerating: boolean;
  fontSize: number;
  columnCount: number;
}

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
}