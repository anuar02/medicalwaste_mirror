import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Package, Radio, Truck, BarChart3 } from 'lucide-react';

const steps = [
  {
    icon: Package,
    title: 'Sensor Installation',
    description: 'ESP32 sensors are installed on medical waste containers with GPS and environmental monitoring capabilities.',
    number: '01',
  },
  {
    icon: Radio,
    title: 'Data Transmission',
    description: 'Sensors continuously transmit real-time data including location, fill level, temperature, and container status.',
    number: '02',
  },
  {
    icon: Truck,
    title: 'Smart Collection',
    description: 'Drivers receive optimized routes and notifications when containers need collection, reducing unnecessary trips.',
    number: '03',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Supervisors monitor all operations in real-time with comprehensive analytics and compliance reporting.',
    number: '04',
  },
];

export default function HowItWorksSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const pathLength = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);

  return (
    <section
      ref={containerRef}
      style={{
        minHeight: '100vh',
        padding: '8rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      {/* Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
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
          style={{ textAlign: 'center', marginBottom: '6rem' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            viewport={{ once: true }}
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '50px',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: '#3b82f6', fontSize: '0.875rem', fontWeight: '500' }}>
              How It Works
            </span>
          </motion.div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Four Simple Steps
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            From installation to insights, our IoT platform automates your entire medical waste management workflow
          </p>
        </motion.div>

        {/* Journey Path */}
        <div style={{ position: 'relative' }}>
          {/* SVG Path Line */}
          <svg
            style={{
              position: 'absolute',
              top: '100px',
              left: '0',
              width: '100%',
              height: '400px',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 100 200 Q 400 100, 500 200 T 1100 200"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="10 10"
              initial={{ pathLength: 0 }}
              style={{ pathLength }}
            />
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Steps Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
            position: 'relative',
            zIndex: 10,
          }}>
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.2,
                  duration: 0.8,
                  type: 'spring',
                  stiffness: 100,
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
                style={{
                  position: 'relative',
                }}
              >
                {/* Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Gradient Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '4px',
                    background: `linear-gradient(90deg, ${
                      index === 0 ? '#10b981' :
                      index === 1 ? '#3b82f6' :
                      index === 2 ? '#8b5cf6' :
                      '#f59e0b'
                    } 0%, transparent 100%)`,
                  }} />

                  {/* Step Number */}
                  <div style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    fontSize: '4rem',
                    fontWeight: '800',
                    color: '#f1f5f9',
                    lineHeight: 1,
                  }}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      width: '70px',
                      height: '70px',
                      background: `linear-gradient(135deg, ${
                        index === 0 ? '#10b981' :
                        index === 1 ? '#3b82f6' :
                        index === 2 ? '#8b5cf6' :
                        '#f59e0b'
                      } 0%, ${
                        index === 0 ? '#059669' :
                        index === 1 ? '#2563eb' :
                        index === 2 ? '#7c3aed' :
                        '#d97706'
                      } 100%)`,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.5rem',
                      boxShadow: `0 10px 30px ${
                        index === 0 ? 'rgba(16, 185, 129, 0.3)' :
                        index === 1 ? 'rgba(59, 130, 246, 0.3)' :
                        index === 2 ? 'rgba(139, 92, 246, 0.3)' :
                        'rgba(245, 158, 11, 0.3)'
                      }`,
                    }}
                  >
                    <step.icon size={32} color="#fff" />
                  </motion.div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '1rem',
                  }}>
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    lineHeight: '1.7',
                    flex: 1,
                  }}>
                    {step.description}
                  </p>

                  {/* Image Placeholder */}
                  <div style={{
                    marginTop: '1.5rem',
                    width: '100%',
                    height: '180px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                    }}>
                      [Journey Scene {index + 1}]
                      <br />
                      Image Placeholder
                    </div>
                  </div>

                  {/* Animated particles on hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -20, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        style={{
                          position: 'absolute',
                          left: `${20 + i * 15}%`,
                          bottom: '20%',
                          width: '4px',
                          height: '4px',
                          background: index === 0 ? '#10b981' :
                                     index === 1 ? '#3b82f6' :
                                     index === 2 ? '#8b5cf6' :
                                     '#f59e0b',
                          borderRadius: '50%',
                        }}
                      />
                    ))}
                  </motion.div>
                </div>

                {/* Connection Arrow (except last item) */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                    viewport={{ once: true }}
                    style={{
                      position: 'absolute',
                      right: '-3rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '2rem',
                      color: '#cbd5e1',
                      zIndex: 20,
                      display: window.innerWidth < 768 ? 'none' : 'block',
                    }}
                  >
                    →
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          viewport={{ once: true }}
          style={{
            marginTop: '6rem',
            textAlign: 'center',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            className="hoverable"
            style={{
              padding: '1.25rem 3rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#0f172a',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Start Your Journey
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
