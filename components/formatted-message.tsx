import React from 'react';
import { TypewriterText } from './typewriter-text';

interface FormattedMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  isNew?: boolean;
}

export function FormattedMessage({ content, role, isNew = false }: FormattedMessageProps) {
  // For AI responses that are new, use typewriter effect
  if (role === 'assistant' && isNew) {
    return (
      <div className="message-content ai-response">
        <TypewriterText text={content} speed={30} />
      </div>
    );
  }

  // Parse the content and convert it to JSX
  const parseContent = (text: string) => {
    const paragraphs = text.split('\n\n');

    return paragraphs.map((paragraph, paragraphIndex) => {
      const lines = paragraph.split('\n');

      // Check if this is a numbered list
      if (lines.some(line => /^\d+\.\s/.test(line))) {
        const listItems = lines
          .filter(line => /^\d+\.\s/.test(line))
          .map((line, index) => (
            <li key={index} className="mb-1">
              {line.replace(/^\d+\.\s*/, '')}
            </li>
          ));

        return (
          <ol key={paragraphIndex} className="list-decimal list-inside space-y-1 mb-4">
            {listItems}
          </ol>
        );
      }

      // Check if this is a bullet list
      if (lines.some(line => /^[•\-\*]\s/.test(line))) {
        const listItems = lines
          .filter(line => /^[•\-\*]\s/.test(line))
          .map((line, index) => (
            <li key={index} className="mb-1">
              {line.replace(/^[•\-\*]\s*/, '')}
            </li>
          ));

        return (
          <ul key={paragraphIndex} className="list-disc list-inside space-y-1 mb-4">
            {listItems}
          </ul>
        );
      }

      // Regular paragraph
      return (
        <p key={paragraphIndex} className="mb-4 last:mb-0">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className={`message-content ${role === 'assistant' ? 'ai-response' : 'user-message'}`}>
      {parseContent(content)}
    </div>
  );
}