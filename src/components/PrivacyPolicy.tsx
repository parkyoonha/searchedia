import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <span className="font-bold text-xl tracking-tight text-slate-900">Searchedia</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: January 31, 2025</p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-slate-700 leading-relaxed">
              Searchedia ("we", "our", "us") values your privacy and is committed to protecting your personal information.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-medium text-slate-800 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Account Information:</strong> Email address, name, profile picture (when signing in with Google)</li>
              <li><strong>Usage Data:</strong> Search queries, project data, keyword preferences</li>
              <li><strong>Device Information:</strong> Browser type, IP address, device identifiers</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-4">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Cookies and similar tracking technologies</li>
              <li>Analytics data (page views, session duration, interactions)</li>
              <li>Log data (access times, pages viewed, referring URLs)</li>
            </ul>
          </section>

          {/* 2. Purpose of Collection */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Purpose of Collection</h2>
            <p className="text-slate-700 mb-3">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Service Provision:</strong> To provide, maintain, and improve our stock image search service</li>
              <li><strong>Account Management:</strong> To create and manage your user account</li>
              <li><strong>Personalization:</strong> To personalize your experience and save your preferences</li>
              <li><strong>Communication:</strong> To send service-related notices and respond to inquiries</li>
              <li><strong>Analytics:</strong> To analyze usage patterns and improve our service</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security issues</li>
            </ul>
          </section>

          {/* 3. Retention Period */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Retention Period</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Account Data:</strong> Retained while your account is active and for 30 days after deletion request</li>
              <li><strong>Project Data:</strong> Retained while your account is active; deleted upon account deletion</li>
              <li><strong>Analytics Data:</strong> Retained for up to 26 months</li>
              <li><strong>Log Data:</strong> Retained for up to 90 days</li>
            </ul>
          </section>

          {/* 4. Third-Party Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Third-Party Sharing</h2>
            <p className="text-slate-700 mb-3">We may share your information with the following third parties:</p>

            <h3 className="text-lg font-medium text-slate-800 mb-2">Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Google Analytics:</strong> Website analytics and usage tracking</li>
              <li><strong>Groq / Google Gemini:</strong> AI-powered keyword optimization (API requests only, no personal data)</li>
              <li><strong>Stock Image APIs:</strong> Unsplash, Pexels, Pixabay (search queries only)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-4">Legal Requirements</h3>
            <p className="text-slate-700">
              We may disclose your information if required by law, court order, or government request,
              or to protect our rights, privacy, safety, or property.
            </p>
          </section>

          {/* 5. User Rights */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Your Rights</h2>
            <p className="text-slate-700 mb-3">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Request export of your data in a portable format</li>
              <li><strong>Opt-out:</strong> Opt out of marketing communications and certain data collection</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-4">How to Exercise Your Rights</h3>
            <p className="text-slate-700">
              To exercise any of these rights, please contact us at the email address provided below.
              We will respond to your request within 30 days.
            </p>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Cookies and Tracking</h2>
            <p className="text-slate-700 mb-3">We use the following types of cookies:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-slate-700 mt-3">
              You can manage cookie preferences through your browser settings.
              Disabling certain cookies may affect the functionality of our service.
            </p>
          </section>

          {/* 7. Security */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Data Security</h2>
            <p className="text-slate-700">
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-3">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments</li>
              <li>Access controls and monitoring</li>
            </ul>
          </section>

          {/* 8. Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Children's Privacy</h2>
            <p className="text-slate-700">
              Our service is not intended for children under 13 years of age.
              We do not knowingly collect personal information from children under 13.
              If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* 9. Changes to Privacy Policy */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time.
              We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 10. Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Privacy Officer Contact</h2>
            <div className="bg-slate-100 rounded-lg p-6">
              <p className="text-slate-700 mb-2"><strong>Privacy Officer:</strong> Searchedia Privacy Team</p>
              <p className="text-slate-700 mb-2"><strong>Email:</strong> privacy@searchedia.com</p>
              <p className="text-slate-700">
                For any questions, concerns, or requests regarding this Privacy Policy or your personal data,
                please contact us at the above email address.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Searchedia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
