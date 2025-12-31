import React, { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  delay?: number;
  instant?: boolean;
  className?: string;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({ text, speed = 50, delay = 0, instant = false, className }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const delayTimeout = setTimeout(() => {
        setStarted(true);
      }, delay);
      return () => clearTimeout(delayTimeout);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    if (instant) {
      // Display all text at once
      setDisplayedText(text);
      return;
    }

    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i > text.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, started, instant]);

  return <span className={className}>{displayedText}</span>;
};
