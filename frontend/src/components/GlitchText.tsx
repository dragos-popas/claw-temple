import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
}

export function GlitchText({ text, className = '', as: Component = 'span' }: GlitchTextProps) {
  return (
    <Component className={`relative inline-block ${className}`}>
      {/* Main text layer */}
      <span className="relative z-10">{text}</span>
      {/* Glitch effect layer (pink) */}
      <span 
        className="absolute top-0 left-0 text-cyber-pink opacity-60 select-none"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
          transform: 'translate(-1px, 0)'
        }}
        aria-hidden="true"
      >
        {text}
      </span>
      {/* Glitch effect layer (cyan) */}
      <span 
        className="absolute top-0 left-0 text-cyber-cyan opacity-60 select-none"
        style={{ 
          clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
          transform: 'translate(1px, 0)'
        }}
        aria-hidden="true"
      >
        {text}
      </span>
    </Component>
  );
}