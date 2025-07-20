import React from 'react';

export const SmileyFaceIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
  >
    <circle cx="9" cy="9.75" r="0.75" fill="currentColor" />
    <circle cx="15" cy="9.75" r="0.75" fill="currentColor" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.5 14.5a3 3 0 0 0 5 0"
    />
  </svg>
);