import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function Formula({ latex, displayMode = true, className = '' }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return latex;
    }
  }, [latex, displayMode]);

  return (
    <div
      className={`katex-wrap ${displayMode ? 'rounded-xl border border-white/5 bg-black/30 px-3 py-2 overflow-x-auto' : ''} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
