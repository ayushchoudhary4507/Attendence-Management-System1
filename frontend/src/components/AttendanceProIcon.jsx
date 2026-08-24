import React from 'react';

/**
 * AttendanceProIcon Component (AMS Fingerprint Brand Icon)
 * Exact 1-to-1 match of the blue squircle with white fingerprint + AMS text.
 */
export const AttendanceProIcon = ({ size = 40, className = '', style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`ams-brand-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: `${Math.round(size * 0.25)}px`,
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        <linearGradient id="amsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Background */}
      <rect width="100" height="100" rx="25" ry="25" fill="url(#amsGradient)" />

      {/* Biometric Fingerprint Icon (Material Rounded Biometric) */}
      <g transform="translate(32, 16) scale(1.5)" fill="#FFFFFF">
        <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4 0-1.36.7-2.5 1.69-3.4 2.96-.08.14-.23.22-.39.22zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.58 1.07.99 1.54 1.73 2.27.2.2.2.51 0 .71-.11.1-.23.16-.36.16zm6.34-2.23c-.15 0-.3-.07-.39-.2-.71-.97-1.12-2.18-1.12-3.41 0-1.28-1.04-2.32-2.32-2.32s-2.32 1.04-2.32 2.32c0 .66-.23 1.94-1.08 3.09-.17.22-.48.27-.7.1-.22-.17-.27-.48-.1-.7.74-1 1.01-2.22 1.01-2.81 0-1.83 1.49-3.32 3.32-3.32s3.32 1.49 3.32 3.32c0 1.45.48 2.89 1.34 4.05.17.22.12.54-.1.7-.09.08-.2.12-.32.12zM12 21.75c-.13 0-.26-.05-.35-.15-1.09-1.09-1.85-2.05-2.24-2.84-.71-1.42-.71-2.96-.71-3.6 0-1.57 1.28-2.85 2.85-2.85s2.85 1.28 2.85 2.85c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-1.02-.83-1.85-1.85-1.85s-1.85.83-1.85 1.85c0 .54 0 1.88.58 3.05.33.66.97 1.49 1.9 2.42.2.2.2.51 0 .71-.1.1-.23.16-.35.16z"/>
      </g>

      {/* AMS Brand Text (Same to same bold white font) */}
      <text
        x="50"
        y="80"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Inter, system-ui, -apple-system, Roboto, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize="25"
        letterSpacing="1.5"
      >
        AMS
      </text>
    </svg>
  );
};

export default AttendanceProIcon;
