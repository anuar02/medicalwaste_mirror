import { useEffect } from 'react';
import Lenis from 'lenis';
import './App.css';

// Components
import CustomCursor from './components/CustomCursor.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import HeroSection from './components/HeroSection.jsx';
import ProblemSolutionSection from './components/ProblemSolutionSection.jsx';
import FeaturesSection from './components/FeaturesSection.jsx';
import HowItWorksSection from './components/HowItWorksSection.jsx';
import TechnologyShowcase from './components/TechnologyShowcase.jsx';
import DashboardPreview from './components/DashboardPreview.jsx';
import BenefitsSection from './components/BenefitsSection.jsx';
import StatsTicker from './components/StatsTicker.jsx';
import FinalCTA from './components/FinalCTA.jsx';

function App() {
  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Animation frame loop
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Add Lenis class to html element
    document.documentElement.classList.add('lenis');

    // Cleanup
    return () => {
      lenis.destroy();
      document.documentElement.classList.remove('lenis');
    };
  }, []);

  return (
    <div className="App">
      {/* Custom Cursor */}
      <CustomCursor />

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Main Content */}
      <main>
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Problem/Solution Split */}
        <ProblemSolutionSection />

        {/* 3. Features Carousel */}
        <FeaturesSection />

        {/* 4. How It Works */}
        <HowItWorksSection />

        {/* 5. Technology Showcase */}
        <TechnologyShowcase />

        {/* 6. Dashboard Preview */}
        <DashboardPreview />

        {/* 7. Benefits Bento Grid */}
        <BenefitsSection />

        {/* 8. Stats Ticker */}
        <StatsTicker />

        {/* 9. Final CTA */}
        <FinalCTA />
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '3rem 2rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              MedicalWaste.kz
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              IoT-powered medical waste management platform
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="#"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#10b981')}
              onMouseLeave={(e) => (e.target.style.color = '#64748b')}
            >
              Privacy Policy
            </a>
            <a
              href="#"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#10b981')}
              onMouseLeave={(e) => (e.target.style.color = '#64748b')}
            >
              Terms of Service
            </a>
            <a
              href="#"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#10b981')}
              onMouseLeave={(e) => (e.target.style.color = '#64748b')}
            >
              Contact Us
            </a>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1400px',
            margin: '2rem auto 0',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.875rem',
          }}
        >
          © 2024 MedicalWaste.kz. All rights reserved. Built with cutting-edge IoT technology.
        </div>
      </footer>
    </div>
  );
}

export default App;
