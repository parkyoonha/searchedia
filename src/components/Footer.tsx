import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-row items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Searchedia
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/privacy"
            className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
