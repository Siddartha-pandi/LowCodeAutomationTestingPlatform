import React from "react";

interface BrowserLogoProps {
  className?: string;
  size?: number;
}

export function BrowserAutomationLogo({ className = "w-12 h-12", size = 48 }: BrowserLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-black dark:bg-white text-white dark:text-black p-2.5 shadow-md border border-neutral-700 dark:border-neutral-300 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-current"
      >
        {/* Browser Window Outline */}
        <rect
          x="3"
          y="5"
          width="34"
          height="28"
          rx="5"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-90"
        />
        {/* Browser Top Navigation Bar */}
        <line
          x1="3"
          y1="13"
          x2="37"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-40"
        />
        {/* Window Dots */}
        <circle cx="7.5" cy="9" r="1.25" fill="currentColor" className="opacity-80" />
        <circle cx="11.5" cy="9" r="1.25" fill="currentColor" className="opacity-80" />
        <circle cx="15.5" cy="9" r="1.25" fill="currentColor" className="opacity-80" />
        {/* Mini URL Bar */}
        <rect
          x="19"
          y="7.5"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          className="opacity-30"
        />
        {/* Automation Node & Direct Cursor Arrow */}
        <path
          d="M13 25L17 21M17 21L20 27L22 23L27 25L23 17L17 21Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Deterministic Execution Target Reticle Ring */}
        <circle
          cx="26"
          cy="20"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          className="opacity-60 animate-spin-slow origin-center"
        />
      </svg>
    </div>
  );
}
