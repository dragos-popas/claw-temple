import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
}

export function GlitchText({ text, className = '', as: Component = 'span' }: GlitchTextProps) {
  return (
    <Component className={`relative inline-block ${className}`}>
      <span className="relative z-10">{text}</span>
      <span 
        className="absolute top-0 left-0 -ml-0.5 opacity-50 text-cyber-pink"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
          transform: 'translate(-2px, 0)',
          animation: 'glitch-1 0.3s infinite'
        }}
      >
        {text}
      </span>
      <span 
        className="absolute top-0 left-0 -ml-0.5 opacity-50 text-cyber-cyan"
        style={{ 
          clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
          transform: 'translate(2px, 0)',
          animation: 'glitch-2 0.3s infinite'
        }}
      >
        {text}
      </span>
    </Component>
  );
}