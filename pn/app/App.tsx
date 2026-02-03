import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import LandingPage from '@/app/components/LandingPage';
import Opening from '@/app/components/Opening';

export default function App() {
  const [showOpening, setShowOpening] = useState(true);

  const handleOpeningComplete = () => {
    setShowOpening(false);
  };

  return (
    <>
      {/* Main page is always rendered behind */}
      <LandingPage />

      {/* Opening slides out to reveal main page */}
      <AnimatePresence>
        {showOpening && (
          <Opening key="opening" onComplete={handleOpeningComplete} />
        )}
      </AnimatePresence>
    </>
  );
}
