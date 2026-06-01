/**
 * Standardized Date Formatter Utility
 * Handles fallback dates, local date strings, and relative times.
 */

export const getSafeDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
};

export const formatDate = (value, options = {}) => {
  const date = getSafeDate(value);
  const defaultOptions = { month: 'short', day: 'numeric', year: 'numeric', ...options };
  return date.toLocaleDateString('en-US', defaultOptions);
};

export const formatRelativeTime = (value) => {
  const date = getSafeDate(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;

  return formatDate(date);
};
