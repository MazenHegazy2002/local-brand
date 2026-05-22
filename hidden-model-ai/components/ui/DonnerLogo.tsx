import React from 'react';

export const DonnerLogo = ({ className = 'h-16 w-auto' }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 819 1024"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DONNER Logo"
    >
      <defs>
        <filter id="threshold-filter">
          {/* 
             Push dark red to black (transparent) and white to white (opaque).
             The image is Red (~#2C0505) and White (#FFFFF0).
             We sum the channels and subtract a threshold.
             Red sum is low (<0.3). White sum is high (>2.9).
             Shift -1.0 so Red becomes negative (0) and White stays positive (1).
          */}
          <feColorMatrix
            type="matrix"
            values="1 1 1 0 -1 
                    1 1 1 0 -1 
                    1 1 1 0 -1 
                    0 0 0 1 0"
          />
        </filter>
        <mask id="logo-mask">
          <image href="/doner-bolt.jpg" width="819" height="1024" filter="url(#threshold-filter)" />
        </mask>
      </defs>

      {/* 
         Fill with the current text color (Gold) 
         but only where the mask (original white bolt) allows.
      */}
      <rect width="100%" height="100%" fill="currentColor" mask="url(#logo-mask)" />
    </svg>
  );
};
