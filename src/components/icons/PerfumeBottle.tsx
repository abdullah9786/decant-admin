import React from "react";

interface PerfumeBottleProps {
  size?: number;
  className?: string;
}

export function PerfumeBottle({ size = 24, className = "" }: PerfumeBottleProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="8" width="12" height="13" rx="1.5" />
      <rect x="9" y="4" width="6" height="4" rx="0.75" />
      <line x1="10.5" y1="2" x2="13.5" y2="2" />
      <line x1="12" y1="2" x2="12" y2="4" />
    </svg>
  );
}
