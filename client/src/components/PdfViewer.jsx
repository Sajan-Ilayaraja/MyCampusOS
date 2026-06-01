import React from 'react';

/**
 * Reusable dynamic PdfViewer component
 * Isolates the heavy PDF rendering iframe thread to optimize client-side bundle performance.
 */
const PdfViewer = ({ src, title, className = 'rounded-xl border border-slate-900 bg-white' }) => {
  return (
    <iframe
      src={`${src}#toolbar=1`}
      width="100%"
      height="100%"
      className={className}
      title={title || 'PDF Document'}
    />
  );
};

export default PdfViewer;
