import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-white border-t border-slate-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1">
                <Info className="h-3 w-3" />
                Readme
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Image License Notice
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4 pt-2">
                  <div className="bg-slate-100 rounded-lg p-4 space-y-3">
                    <p className="font-semibold text-slate-800 text-sm">Copyright Notice</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>All images are copyrighted by their respective stock platforms (Unsplash, Pexels, Pixabay, etc.)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>This service is a search and organization tool only; <span className="font-medium text-red-600">no resale rights are granted</span></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>Users are responsible for verifying licenses before final use</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 text-sm">To use these images:</p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Visit the <span className="text-blue-600 font-medium">original stock website</span></li>
                      <li>• Download or purchase the full-resolution image</li>
                      <li>• Review and comply with the licensing terms</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600">
                      Searchedia helps you discover and organize stock images.
                      You are responsible for obtaining proper licenses before using any images in your projects.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction className="bg-blue-600 hover:bg-blue-700">I Understand</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </footer>
  );
}
