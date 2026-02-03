import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OpeningProps {
  onComplete: () => void;
}

const Opening: React.FC<OpeningProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'logo' | 'exit'>('logo');

  useEffect(() => {
    // Logo animation duration, then start exit
    const timer = setTimeout(() => {
      setPhase('exit');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleExitComplete = () => {
    if (phase === 'exit') {
      onComplete();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {phase === 'logo' && (
        <motion.div
          key="opening-content"
          initial={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-50 bg-white"
        >
          {/* Logo Container - positioned absolutely to move with parent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
            {/* Logo SVG with stroke animation */}
            <svg
              width="120"
              height="26"
              viewBox="0 0 4093 897"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="md:w-[160px] md:h-[35px]"
            >
              <motion.path
                d="M2046.5 50C2609.14 50 3117 100.017 3482.89 180.203C3666.24 220.385 3811.23 267.573 3909.17 318.318C3958.2 343.723 3992.96 368.767 4014.88 392.235C4036.56 415.454 4043 434.077 4043 448.5C4043 462.923 4036.56 481.546 4014.88 504.765C3992.96 528.233 3958.2 553.277 3909.17 578.682C3811.23 629.427 3666.24 676.615 3482.89 716.797C3117 796.983 2609.14 847 2046.5 847C1483.86 847 975.998 796.983 610.109 716.797C426.758 676.615 281.765 629.427 183.827 578.682C134.797 553.277 100.036 528.233 78.123 504.765C56.4434 481.546 50 462.923 50 448.5C50 434.077 56.4434 415.454 78.123 392.235C100.036 368.767 134.797 343.723 183.827 318.318C281.765 267.573 426.758 220.385 610.109 180.203C975.998 100.017 1483.86 50 2046.5 50Z"
                stroke="black"
                strokeWidth="100"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Opening;
