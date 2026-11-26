import React from "react";

interface BrowserLogoProps {
  className?: string;
  size?: number;
}

export function BrowserAutomationLogo({ className = "w-10 h-10", size = 40 }: BrowserLogoProps) {
  const iconSize = Math.max(16, Math.round((size || 40) * 0.6));

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-md border border-neutral-700 dark:border-neutral-300 select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="DOLPHIN APPS"
    >
      <i
        className="fi fi-tr-dolphin flex items-center justify-center leading-none"
        style={{ fontSize: `${iconSize}px` }}
      />
    </div>
  );
}
