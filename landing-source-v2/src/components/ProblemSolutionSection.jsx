import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AlertTriangle, CheckCircle, TrendingUp, Shield } from 'lucide-react';

export default function ProblemSolutionSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const problemWidth = useTransform(scrollYProgress, [0.2, 0.5], ['50%', '20%']);
  const solutionWidth = useTransform(scrollYProgress, [0.2, 0.5], ['50%', '80%']);

  return (
    <section
      ref={containerRef}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '4rem 0',
      }}
    >
      <div style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        position: 'relative',
      }}>
        {/* Problem Side */}
        <motion.div
          style={{
            width: problemWidth,
            background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '2rem',
          }}
        >
          <div style={{
            padding: '2rem',
            maxWidth: '600px',
            position: 'relative',
            zIndex: 10,
            width: '100%',
          }}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '1.5rem',
                lineHeight: '1.2',
              }}>
                The Problem
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#475569',
                marginBottom: '2rem',
                lineHeight: '1.8',
              }}>
                Traditional medical waste management is inefficient, manual, and prone to errors. 
                Facilities struggle with tracking, compliance, and real-time visibility.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  'Manual tracking with paper logs',
                  'No real-time container status',
                  'Compliance risks and penalties',
                  'Inefficient collection routes',
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: '#475569',
                      fontSize: '0.95rem',
                    }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: '#ef4444',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }} />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Image Placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
              style={{
                marginTop: '3rem',
                width: '100%',
                height: '250px',
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: '12px',
                border: '2px dashed rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <AlertTriangle size={60} color="#ef4444" style={{ opacity: 0.2 }} />
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                color: '#94a3b8',
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '0 1rem',
              }}>
                [Chaotic Facility Scene - Image Placeholder]
              </div>
            </motion.div>
          </div>

          {/* Scattered particles effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.05,
            pointerEvents: 'none',
          }}>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  repeatType: 'loop',
                  delay: Math.random() * 2,
                }}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: '4px',
                  height: '4px',
                  background: '#ef4444',
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Solution Side */}
        <motion.div
          style={{
            width: solutionWidth,
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '2rem',
          }}
        >
          <div style={{
            padding: '2rem',
            maxWidth: '600px',
            position: 'relative',
            zIndex: 10,
            width: '100%',
          }}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1.5rem' }} />
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '1.5rem',
                lineHeight: '1.2',
              }}>
                Our Solution
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#475569',
                marginBottom: '2rem',
                lineHeight: '1.8',
              }}>
                MedicalWaste.kz provides complete IoT-powered automation with real-time tracking, 
                intelligent analytics, and seamless compliance management.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: Shield, text: 'Automated compliance tracking' },
                  { icon: TrendingUp, text: 'Real-time container monitoring' },
                  { icon: CheckCircle, text: 'GPS-enabled route optimization' },
                  { icon: AlertTriangle, text: 'Instant alerts and notifications' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '0.875rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <item.icon size={20} color="#10b981" />
                    <span style={{ color: '#0f172a', fontWeight: '500', fontSize: '0.95rem' }}>{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
              style={{
                marginTop: '3rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
              }}
            >
              {[
                { value: '85%', label: 'Cost Reduction' },
                { value: '100%', label: 'Compliance' },
                { value: '24/7', label: 'Monitoring' },
              ].map((stat, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#475569',
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Image Placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
              style={{
                marginTop: '3rem',
                width: '100%',
                height: '250px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '12px',
                border: '2px dashed rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <CheckCircle size={60} color="#10b981" style={{ opacity: 0.2 }} />
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                color: '#94a3b8',
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '0 1rem',
              }}>
                [Dashboard Visualization - Image Placeholder]
              </div>
            </motion.div>
          </div>

          {/* Organized particles effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.05,
            pointerEvents: 'none',
          }}>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                style={{
                  position: 'absolute',
                  left: `${(i % 5) * 20 + 10}%`,
                  top: `${Math.floor(i / 5) * 25 + 12.5}%`,
                  width: '8px',
                  height: '8px',
                  background: '#fff',
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Dividing Line with flowing particles */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: '2px',
          height: '100%',
          background: 'linear-gradient(180deg, #ef4444 0%, #10b981 100%)',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}>
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: ['0%', '100%'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: '6px',
                height: '6px',
                background: '#fff',
                borderRadius: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 10px #fff',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
