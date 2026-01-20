import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', updateScrollProgress);
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="scroll-progress-container" style={{
      position: 'fixed',
      right: '2rem',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{
        width: '2px',
        height: '200px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
        borderRadius: '2px',
      }}>
        <motion.div
          style={{
            width: '100%',
            backgroundColor: '#10b981',
            borderRadius: '2px',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
          }}
          animate={{
            height: `${scrollProgress}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
          }}
        />
      </div>
    </div>
  );
}
