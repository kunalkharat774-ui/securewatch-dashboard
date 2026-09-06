import type React from 'react';

interface ShinyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function ShinyButton({
  children,
  onClick,
  className = '',
  type = 'button',
  disabled = false,
}: ShinyButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`shiny-cta ${className}`}
    >
      <span>{children}</span>
    </button>
  );
}
