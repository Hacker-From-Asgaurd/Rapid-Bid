import React from 'react';

/**
 * DamperLogo Component
 * Renders an industrial multi-blade airflow control / isolation damper with 
 * duct flange frame, aerodynamic louvers, pivot axles, and drive linkage.
 */
export default function DamperLogo({ className = "w-6 h-6", color = "currentColor" }) {
  return (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Outer Flange Duct Frame */}
      <rect 
        x="4" 
        y="4" 
        width="40" 
        height="40" 
        rx="6" 
        stroke={color} 
        strokeWidth="2.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Inner Duct Flow Channel */}
      <rect 
        x="9" 
        y="9" 
        width="30" 
        height="30" 
        rx="2" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeDasharray="2 2"
        opacity="0.4"
      />

      {/* Flange Mounting Bolt Holes in corners */}
      <circle cx="6.5" cy="6.5" r="1.2" fill={color} opacity="0.6" />
      <circle cx="41.5" cy="6.5" r="1.2" fill={color} opacity="0.6" />
      <circle cx="6.5" cy="41.5" r="1.2" fill={color} opacity="0.6" />
      <circle cx="41.5" cy="41.5" r="1.2" fill={color} opacity="0.6" />

      {/* Damper Blade 1 (Top) */}
      <line 
        x1="12" 
        y1="14" 
        x2="34" 
        y2="17.5" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* Pivot axle 1 */}
      <circle cx="23" cy="15.75" r="1.8" fill={color} />

      {/* Damper Blade 2 (Upper-Mid) */}
      <line 
        x1="12" 
        y1="22" 
        x2="34" 
        y2="25.5" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* Pivot axle 2 */}
      <circle cx="23" cy="23.75" r="1.8" fill={color} />

      {/* Damper Blade 3 (Lower-Mid) */}
      <line 
        x1="12" 
        y1="30" 
        x2="34" 
        y2="33.5" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* Pivot axle 3 */}
      <circle cx="23" cy="31.75" r="1.8" fill={color} />

      {/* Drive Linkage Bar connecting blades on right */}
      <line 
        x1="33" 
        y1="16.5" 
        x2="33" 
        y2="34" 
        stroke={color} 
        strokeWidth="1.75" 
        strokeLinecap="round" 
        opacity="0.75"
      />
      <circle cx="33" cy="16.5" r="1" fill={color} />
      <circle cx="33" cy="24.5" r="1" fill={color} />
      <circle cx="33" cy="32.5" r="1" fill={color} />
    </svg>
  );
}
