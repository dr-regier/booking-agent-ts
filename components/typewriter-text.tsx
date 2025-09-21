'use client';

import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  showCursor?: boolean;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 50,
  showCursor = true,
  onComplete
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Store the original text to prevent changes during animation
    const originalText = text;
    let index = 0;
    setDisplayText('');
    setIsComplete(false);

    const timer = setInterval(() => {
      if (index < originalText.length) {
        setDisplayText(originalText.substring(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
        if (onComplete) {
          onComplete();
        }
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className="inline-block">
      {displayText}
      {showCursor && !isComplete && (
        <span className="inline-block w-2 h-5 bg-white/60 ml-1 animate-pulse" />
      )}
    </span>
  );
}