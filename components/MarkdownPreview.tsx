import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownPreviewProps {
  content: string;
  fontSize: number;
  columnCount: number;
  isGenerating?: boolean;
}

const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  ({ content, fontSize, columnCount, isGenerating }, ref) => {
    return (
      <div 
        ref={ref}
        className="a4-paper compact-content text-justify relative bg-white text-slate-900"
        style={{ 
          fontSize: `${fontSize}px`,
          columnCount: columnCount,
          columnGap: '10mm',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Override paragraph to ensure tight spacing.
            p: ({node, children, ...props}) => (
              <p className="mb-2 leading-snug break-inside-avoid" {...props}>
                {children}
              </p>
            ),
            // Bold text
            strong: ({node, children, ...props}) => (
              <strong className="font-bold text-black" {...props}>
                {children}
              </strong>
            ),
            // Lists
            ol: ({node, children, ...props}) => (
              <ol className="list-decimal pl-4 mb-2" {...props}>
                {children}
              </ol>
            ),
            ul: ({node, children, ...props}) => (
              <ul className="list-disc pl-4 mb-2" {...props}>
                {children}
              </ul>
            ),
            li: ({node, children, ...props}) => (
              <li className="pl-1 mb-1" {...props}>
                {children}
              </li>
            ),
            // Headings
            h1: ({node, children, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4 border-b pb-1 border-slate-300" {...props}>{children}</h1>,
            h2: ({node, children, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3" {...props}>{children}</h2>,
            h3: ({node, children, ...props}) => <h3 className="text-base font-bold mb-1 mt-2" {...props}>{children}</h3>,
          }}
        >
          {content}
        </ReactMarkdown>
        
        {/* Blinking Cursor for Real-time Effect - Hidden during print/capture via class */}
        {isGenerating && (
          <span className="inline-block w-2.5 h-5 ml-1 bg-indigo-600 animate-pulse align-middle shadow-sm no-capture"></span>
        )}
      </div>
    );
  }
);

MarkdownPreview.displayName = 'MarkdownPreview';

export default MarkdownPreview;