import React from 'react';

interface MetaAiIconProps {
  className?: string;
  size?: number;
}

/**
 * Meta AI Ring Icon:
 * The signature iridescent gradient ring representing Meta AI.
 */
export const MetaAiIcon: React.FC<MetaAiIconProps> = ({ className = 'w-5 h-5', size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Meta AI"
    >
      <defs>
        <linearGradient id="metaAiGradRing" x1="5%" y1="95%" x2="95%" y2="5%">
          <stop offset="0%" stopColor="#0866FF" />
          <stop offset="30%" stopColor="#7B2CBF" />
          <stop offset="65%" stopColor="#E11D48" />
          <stop offset="85%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <radialGradient id="metaAiCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#6366F1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft center ambient glow */}
      <circle cx="50" cy="50" r="22" fill="url(#metaAiCenterGlow)" />
      {/* The signature Meta AI ring */}
      <circle
        cx="50"
        cy="50"
        r="34"
        stroke="url(#metaAiGradRing)"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
};
