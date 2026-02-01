import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-white border-t border-slate-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Searchedia. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/privacy"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
