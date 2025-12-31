import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { X, CheckCircle2, AlertTriangle, BookOpen, ShieldCheck } from 'lucide-react';

interface ReadmeProps {
  onClose: () => void;
}

export function Readme({ onClose }: ReadmeProps) {
  return (
    <div className="fixed inset-0 top-16 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <div className="h-16 border-b bg-white px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              <BookOpen className="h-5 w-5 text-indigo-600" />
           </div>
           <div>
              <h2 className="text-lg font-semibold text-slate-900">Documentation & Legal</h2>
              <p className="text-sm text-slate-500">System guidelines and compliance information</p>
           </div>
        </div>
        <Button variant="secondary" onClick={onClose}>
           <X className="mr-2 h-4 w-4" /> Close
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Compliance Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              Legal & Compliance
            </h3>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Usage & Copyright</CardTitle>
                <CardDescription>
                  This service operates in strict compliance with the terms of use for Unsplash, Pexels, and other stock content providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Allowed Actions
                    </h4>
                    <ul className="text-sm text-green-700 space-y-2 list-disc pl-4">
                      <li><strong>Meta-Search:</strong> Searching multiple libraries via official APIs.</li>
                      <li><strong>Hotlinking:</strong> Displaying images directly from source URLs.</li>
                      <li><strong>Attribution:</strong> Automatic credit given to authors.</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Prohibited Actions
                    </h4>
                    <ul className="text-sm text-red-700 space-y-2 list-disc pl-4">
                      <li><strong>No Scraping:</strong> Unauthorized data collection is banned.</li>
                      <li><strong>No Storage:</strong> Images are never cached on our servers.</li>
                      <li><strong>No Watermark Removal:</strong> Strictly prohibited by law.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Guide Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              User Guide
            </h3>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none text-slate-600">
                <p>
                  LexiGrid AI helps you organize and visualize your content ideas.
                  Use the <strong>AI Content Generator</strong> to find the perfect stock assets for your projects.
                </p>
                <ul className="list-disc pl-4 space-y-2 mt-4">
                  <li><strong>Search:</strong> Enter keywords to find images and videos.</li>
                  <li><strong>Collections:</strong> Save items to your list for later review.</li>
                  <li><strong>Export:</strong> Download your collection references (URL list).</li>
                </ul>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
