import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, MapPin, Activity, CheckCircle, Zap } from 'lucide-react';

const stats = [
  { icon: MapPin, value: '500+', label: 'Active Containers' },
  { icon: Users, value: '50+', label: 'Healthcare Facilities' },
  { icon: Activity, value: '1M+', label: 'Data Points Daily' },
  { icon: TrendingUp, value: '85%', label: 'Cost Reduction' },
  { icon: CheckCircle, value: '100%', label: 'Compliance Rate' },
  { icon: Zap, value: '99.9%', label: 'System Uptime' },
];

export default function StatsTicker() {
  const tickerRef = useRef(null);

  // Duplicate stats for seamless loop
  const duplicatedStats = [...stats, ...stats, ...stats];

  return (
    <section
      style={{
        padding: '4rem 0',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
      }}
    >
      {/* Top gradient border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)',
      }} />

      {/* Bottom gradient border */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%)',
      }} />

      {/* Ticker Container */}
      <div style={{
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          ref={tickerRef}
          animate={{
            x: [0, -1920], // Adjust based on content width
          }}
          transition={{
            x: {
              duration: 30,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          style={{
            display: 'flex',
            gap: '4rem',
            paddingRight: '4rem',
          }}
        >
          {duplicatedStats.map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                minWidth: '300px',
                padding: '1.5rem 2rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Icon with glow */}
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
                position: 'relative',
              }}>
                <stat.icon size={28} color="#fff" />
                
                {/* Pulsing ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.5],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                  }}
                />
              </div>

              {/* Stat Content */}
              <div>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#0f172a',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, #0f172a 0%, #10b981 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </motion.div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  fontWeight: '500',
                }}>
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Fade edges */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '200px',
        height: '100%',
        background: 'linear-gradient(90deg, #f8fafc 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '200px',
        height: '100%',
        background: 'linear-gradient(90deg, transparent 0%, #f8fafc 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
    </section>
  );
}
