import React from 'react';

export const HackerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Dark Hacker Eye Outer Shape - Cyber almond shape */}
    <path
      d="M10 50 C25 22, 75 22, 90 50 C75 78, 25 78, 10 50 Z"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinejoin="round"
    />
    
    {/* Outer Tech Eye Corner Crosshairs */}
    <path d="M 5 50 L 15 50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="M 85 50 L 95 50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    
    {/* Inner Iris Ring */}
    <circle
      cx="50"
      cy="50"
      r="22"
      stroke="currentColor"
      strokeWidth="5"
      fill="none"
    />
    
    {/* Cyber Target Ticks around Iris */}
    <line x1="50" y1="18" x2="50" y2="25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <line x1="50" y1="75" x2="50" y2="82" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <line x1="18" y1="50" x2="25" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <line x1="75" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

    {/* Dark Pupil Core */}
    <circle
      cx="50"
      cy="50"
      r="13"
      fill="currentColor"
    />

    {/* Pupil Cyber Glare / Lens Reflection */}
    <circle
      cx="45.5"
      cy="45.5"
      r="3"
      fill="#ffffff"
    />

    {/* Tech Aperture Points */}
    <circle cx="36" cy="36" r="2" fill="currentColor" />
    <circle cx="64" cy="36" r="2" fill="currentColor" />
    <circle cx="36" cy="64" r="2" fill="currentColor" />
    <circle cx="64" cy="64" r="2" fill="currentColor" />
  </svg>
);
