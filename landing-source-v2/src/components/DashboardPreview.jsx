import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, BarChart3, List, TrendingUp, MapPin, Activity } from 'lucide-react';

const dashboardViews = [
  {
    id: 'map',
    icon: Map,
    title: 'Live Map View',
    description: 'Real-time container locations with status indicators',
    color: '#10b981',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Comprehensive metrics and performance insights',
    color: '#3b82f6',
  },
  {
    id: 'monitoring',
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Live sensor data and alert management',
    color: '#8b5cf6',
  },
];

export default function DashboardPreview() {
  const containerRef = useRef(null);
  const [activeView, setActiveView] = useState(0);

  // Auto-rotate views
  useState(() => {
    const interval = setInterval(() => {
      setActiveView((prev) => (prev + 1) % dashboardViews.length);
    }, 5000);
    return () => clearInterval(interval);
  });

  return (
    <section
      ref={containerRef}
      style={{
        minHeight: '100vh',
        padding: '8rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: `
          linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
        opacity: 0.5,
      }} />

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            viewport={{ once: true }}
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '50px',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>
              Command Center
            </span>
          </motion.div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Powerful Dashboard
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            Monitor, analyze, and optimize your entire medical waste management operation from one unified interface
          </p>
        </motion.div>

        {/* View Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
        }}>
          {dashboardViews.map((view, index) => (
            <motion.button
              key={view.id}
              onClick={() => setActiveView(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hoverable"
              style={{
                padding: '1rem 2rem',
                background: activeView === index
                  ? `linear-gradient(135deg, ${view.color} 0%, ${view.color}dd 100%)`
                  : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${activeView === index ? view.color : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}
            >
              <view.icon size={20} />
              <span style={{ fontWeight: '600' }}>{view.title}</span>
            </motion.button>
          ))}
        </div>

        {/* Dashboard Container */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 15 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          style={{
            perspective: '2000px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Browser Mockup */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
          }}>
            {/* Browser Header */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <div style={{
                flex: 1,
                marginLeft: '2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                color: '#64748b',
                fontSize: '0.875rem',
              }}>
                medicalwaste.kz/dashboard
              </div>
            </div>

            {/* Dashboard Content */}
            <div style={{
              minHeight: '500px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '2rem',
                  }}
                >
                  {/* View-specific content placeholder */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '500px',
                    background: `linear-gradient(135deg, ${dashboardViews[activeView].color}10 0%, transparent 100%)`,
                    borderRadius: '12px',
                    border: `2px dashed ${dashboardViews[activeView].color}40`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {(() => {
                      const IconComponent = dashboardViews[activeView].icon;
                      return (
                        <IconComponent 
                          size={120} 
                          color={dashboardViews[activeView].color} 
                          style={{ opacity: 0.2, marginBottom: '2rem' }} 
                        />
                      );
                    })()}
                    <div style={{
                      textAlign: 'center',
                      color: '#64748b',
                    }}>
                      <h3 style={{
                        fontSize: '1.5rem',
                        color: '#0f172a',
                        marginBottom: '0.5rem',
                      }}>
                        {dashboardViews[activeView].title}
                      </h3>
                      <p style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                        {dashboardViews[activeView].description}
                      </p>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                      }}>
                        [Dashboard {dashboardViews[activeView].title} Screenshot]
                        <br />
                        Image Placeholder
                      </div>
                    </div>

                    {/* Animated Data Points */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.25,
                        }}
                        style={{
                          position: 'absolute',
                          left: `${10 + (i % 4) * 25}%`,
                          top: `${20 + Math.floor(i / 4) * 50}%`,
                          width: '12px',
                          height: '12px',
                          background: dashboardViews[activeView].color,
                          borderRadius: '50%',
                          boxShadow: `0 0 20px ${dashboardViews[activeView].color}`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          viewport={{ once: true }}
          style={{
            marginTop: '5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}
        >
          {[
            { icon: MapPin, title: 'Live Tracking', value: '500+', label: 'Containers' },
            { icon: TrendingUp, title: 'Efficiency Gain', value: '85%', label: 'Cost Reduction' },
            { icon: Activity, title: 'Real-Time', value: '24/7', label: 'Monitoring' },
            { icon: BarChart3, title: 'Data Points', value: '1M+', label: 'Per Day' },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)' }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}
            >
              <feature.icon size={40} color="#10b981" style={{ marginBottom: '1rem' }} />
              <div style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem',
                fontWeight: '600',
              }}>
                {feature.title}
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.25rem',
              }}>
                {feature.value}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
              }}>
                {feature.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
