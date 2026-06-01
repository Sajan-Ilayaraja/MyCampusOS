import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * Reusable SafeImage Component
 * Prevents DOM mutations by keeping image failure states in React state.
 * Renders fallback initials or a placeholder icon if the image fails to load.
 */
const SafeImage = ({ src, alt, className = '', fallbackText = '', companyDomain = '' }) => {
  const [error, setError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setError(false);
  }, [src, companyDomain]);

  const initials = fallbackText
    ? fallbackText.trim().charAt(0).toUpperCase()
    : '?';

  const imageSrc = src 
    ? src 
    : (companyDomain ? `https://logo.clearbit.com/${companyDomain}` : null);

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700 text-indigo-400 font-bold select-none ${className}`}>
        {fallbackText ? (
          <span>{initials}</span>
        ) : (
          <ImageIcon className="w-1/2 h-1/2 text-slate-500" />
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || 'Image'}
      className={`${className} object-cover`}
      onError={() => setError(true)}
    />
  );
};

export default SafeImage;
