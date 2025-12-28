import React, { useState, useRef, useEffect } from 'react';
import { Upload, Printer, FileText, Settings, Type, Play, RefreshCw, Columns, Image as ImageIcon, Download, Key, Cpu } from 'lucide-react';
import { generateQuestionsStream } from './services/gemini';
import { QuestionType } from './types';
import MarkdownPreview from './components/MarkdownPreview';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  // State
  const [apiKey, setApiKey] = useState<string>('');
  const [modelMode, setModelMode] = useState<string>('auto');
  const [customModel, setCustomModel] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.OBJECTIVE);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(11); // Standard legible print size
  const [columnCount, setColumnCount] = useState<number>(2); // Default 2 columns for compact fit
  const [isDownloadingImg, setIsDownloadingImg] = useState<boolean>(false);

  // Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content generates
  useEffect(() => {
    if (isGenerating && previewContainerRef.current) {
      previewContainerRef.current.scrollTop = previewContainerRef.current.scrollHeight;
    }
  }, [generatedContent, isGenerating]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Please enter your Gemini API Key.");
      return;
    }
    if (!prompt && files.length === 0) {
      alert("Please upload a file or enter a topic prompt.");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent(''); // Clear previous

    // Determine effective model
    const effectiveModel = modelMode === 'custom' ? customModel : modelMode;

    try {
      await generateQuestionsStream(
        apiKey,
        effectiveModel,
        files,
        prompt,
        questionCount,
        questionType,
        (chunk) => {
          setGeneratedContent(prev => prev + chunk);
        }
      );
    } catch (error: any) {
      console.error("Generation failed", error);
      let errorMessage = "**Error: Failed to generate content.**";
      if (error.message.includes("API Key")) {
        errorMessage += " Invalid or missing API Key.";
      } else if (error.message.includes("404")) {
        errorMessage += ` Model '${effectiveModel}' not found or incompatible.`;
      } else {
        errorMessage += " Please check your connection and try again.";
      }
      setGeneratedContent(prev => prev + "\n\n" + errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!paperRef.current) return;

    setIsDownloadingImg(true);

    try {
      // 1. Setup options for high quality
      // We ignore the blinking cursor element via the 'ignoreElements' callback or class check
      const options = {
        scale: 2, // Retina quality
        useCORS: true, // Handle fonts/images
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element: Element) => {
          return element.classList.contains('no-capture');
        },
        // These settings help capture the full scrollable height
        windowWidth: paperRef.current.scrollWidth,
        windowHeight: paperRef.current.scrollHeight,
      };

      // 2. Generate Canvas
      const canvas = await html2canvas(paperRef.current, options);

      // 3. Convert to Image
      const image = canvas.toDataURL('image/png', 1.0);

      // 4. Download
      const link = document.createElement('a');
      link.href = image;
      link.download = `ExamCraft-Paper-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Image generation failed:", err);
      alert("Failed to generate image. Please try again. If the paper is very long, try printing to PDF instead.");
    } finally {
      setIsDownloadingImg(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      
      {/* LEFT SIDEBAR: Controls (Hidden on Print) */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-900 text-white p-6 overflow-y-auto h-screen sticky top-0 no-print flex flex-col gap-6 shadow-xl z-10">
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ExamCraft AI</h1>
            <p className="text-xs text-slate-400">Paper Generator</p>
          </div>
        </div>

        {/* Section 0: Credentials */}
        <div className="space-y-4 border-t border-slate-700 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4" /> Credentials
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Gemini API Key</label>
            <input 
              type="password"
              placeholder="Paste your API Key here..."
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1">Key is used locally and never stored.</p>
          </div>
        </div>

        {/* Section 1: Input */}
        <div className="space-y-4 border-t border-slate-700 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4" /> Source Material
          </h2>
          
          <div className="relative border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-indigo-500 transition-colors bg-slate-800/50">
            <input 
              type="file" 
              multiple 
              accept="image/*,.pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-300">
                {files.length > 0 
                  ? `${files.length} file(s) selected` 
                  : "Drop Chapter PDF or Images"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Additional Instructions / Topic</label>
            <textarea 
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-200"
              rows={3}
              placeholder="E.g., Focus on Calculus, Chapter 5. Hard difficulty."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Configuration */}
        <div className="space-y-4 border-t border-slate-700 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configuration
          </h2>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> AI Model
            </label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 mb-2"
              value={modelMode}
              onChange={(e) => setModelMode(e.target.value)}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
              <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
              <option value="gemini-3-pro-preview">Gemini 3.0 Pro (High IQ)</option>
              <option value="custom">Custom Model Name...</option>
            </select>
            
            {modelMode === 'custom' && (
              <input 
                type="text"
                placeholder="e.g. gemini-1.5-pro"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Count</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={200}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select 
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              >
                {Object.values(QuestionType).map(t => (
                  <option key={t} value={t}>{t.split(' ')[0]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: View Settings */}
        <div className="space-y-4 border-t border-slate-700 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Type className="w-4 h-4" /> Layout
          </h2>
          
          <div>
             <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Font Size</span>
                <span>{fontSize}px</span>
             </div>
             <input 
               type="range" 
               min="8" 
               max="16" 
               step="0.5"
               value={fontSize}
               onChange={(e) => setFontSize(Number(e.target.value))}
               className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
             />
          </div>

          <div className="flex items-center justify-between bg-slate-800 p-2 rounded">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Columns className="w-4 h-4" /> Columns
            </span>
            <div className="flex gap-2">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setColumnCount(num)}
                  className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                    columnCount === num 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-3 pt-6 border-t border-slate-700">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
              isGenerating 
                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25 text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Generate Paper
              </>
            )}
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handlePrint}
              disabled={!generatedContent || isGenerating}
              className="py-2 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Printer className="w-4 h-4" /> PDF
            </button>
            
            <button 
              onClick={handleDownloadImage}
              disabled={!generatedContent || isGenerating || isDownloadingImg}
              className="py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isDownloadingImg ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
               HD Image
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Preview Area */}
      <div 
        ref={previewContainerRef}
        className="flex-1 bg-slate-200 p-8 overflow-auto print-only scroll-smooth"
      >
        {generatedContent ? (
          <div className="animate-fade-in w-full flex justify-center">
            <MarkdownPreview 
              ref={paperRef}
              content={generatedContent} 
              fontSize={fontSize} 
              columnCount={columnCount}
              isGenerating={isGenerating}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 no-print">
            <div className="w-24 h-24 bg-slate-300 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-lg">Generated paper preview will appear here.</p>
            <p className="text-sm max-w-md text-center">
              Configure your settings on the left, enter your API key, and click generate.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default App;