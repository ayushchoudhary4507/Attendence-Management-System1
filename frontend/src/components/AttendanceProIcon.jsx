import React from 'react';

/**
 * AttendanceProIcon Component (AMS Brand Icon)
 * Exact 1-to-1 match of the blue squircle with white fingerprint biometric waves + AMS text.
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
        borderRadius: `${Math.round(size * 0.24)}px`,
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        <linearGradient id="amsIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Background */}
      <rect width="100" height="100" rx="24" ry="24" fill="url(#amsIconGradient)" />

      {/* Biometric Fingerprint Waves */}
      <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Outer Arc */}
        <path d="M 33 36 C 33 25.5 40.5 17.5 50 17.5 C 59.5 17.5 67 25.5 67 36" />
        {/* Middle Arc */}
        <path d="M 38.5 44 C 38.5 33.5 43.5 25 50 25 C 56.5 25 61.5 33.5 61.5 44" />
        {/* Inner U Loop */}
        <path d="M 44.2 49.5 V 38.5 C 44.2 34.5 46.8 32 50 32 C 53.2 32 55.8 34.5 55.8 38.5 V 49.5" />
        {/* Center Vertical Bar */}
        <path d="M 50 39 V 49.5" />
      </g>

      {/* AMS Brand Text */}
      <text
        x="50"
        y="81"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, 'Inter', 'Outfit', Roboto, 'Segoe UI', sans-serif"
        fontWeight="900"
        fontSize="26"
        letterSpacing="2"
      >
        AMS
      </text>
    </svg>
  );
};

export default AttendanceProIcon;

