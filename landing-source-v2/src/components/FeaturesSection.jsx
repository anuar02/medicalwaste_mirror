import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Radio, MapPin, Users, Activity, Shield, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: Radio,
    title: 'ESP32 IoT Sensors',
    description: 'Advanced ESP32 microcontrollers with integrated sensors monitor container status, temperature, and fill levels in real-time.',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    icon: MapPin,
    title: 'GPS Tracking',
    description: 'Real-time location tracking with route optimization ensures efficient collection and complete visibility of your waste containers.',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  {
    icon: Users,
    title: 'Multi-Tenant Platform',
    description: 'Secure, scalable architecture supporting multiple facilities with role-based access control and isolated data management.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
  {
    icon: Activity,
    title: 'Real-Time Analytics',
    description: 'Comprehensive dashboards with live data visualization, predictive analytics, and actionable insights for optimization.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    icon: Shield,
    title: 'Compliance Management',
    description: 'Automated compliance tracking and reporting ensures adherence to medical waste regulations and safety standards.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  {
    icon: TrendingUp,
    title: 'Smart Optimization',
    description: 'AI-powered route planning and predictive maintenance reduce costs and improve operational efficiency by up to 85%.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
];

export default function FeaturesSection() {
  const containerRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const backgroundColor = useTransform(
    scrollYProgress,
    features.map((_, i) => i / features.length),
    features.map(f => f.color)
  );

  return (
    <section
      ref={containerRef}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '8rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      {/* Animated Background */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: backgroundColor,
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />

      {/* Gradient Mesh Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
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
              Powerful Features
            </span>
          </motion.div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Everything You Need
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            Comprehensive IoT platform with cutting-edge technology for complete waste management control
          </p>
        </motion.div>

        {/* 3D Card Stack */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '600px',
          position: 'relative',
          perspective: '2000px',
        }}>
          {features.map((feature, index) => {
            const isActive = index === activeCard;
            const offset = index - activeCard;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, rotateY: -20, z: -200 }}
                whileInView={{ opacity: 1, rotateY: 0, z: 0 }}
                transition={{ 
                  delay: index * 0.1,
                  duration: 0.8,
                  type: 'spring',
                  stiffness: 100,
                }}
                viewport={{ once: true }}
                animate={{
                  x: offset * 100,
                  z: isActive ? 0 : offset * -200,
                  scale: isActive ? 1 : 0.8,
                  opacity: isActive ? 1 : 0.4,
                  rotateY: offset * -10,
                }}
                whileHover={{
                  scale: isActive ? 1.05 : 0.85,
                  z: isActive ? 50 : offset * -200,
                }}
                onClick={() => setActiveCard(index)}
                className="hoverable"
                style={{
                  position: 'absolute',
                  width: '450px',
                  height: '550px',
                  background: feature.gradient,
                  borderRadius: '24px',
                  padding: '3rem',
                  cursor: 'pointer',
                  transformStyle: 'preserve-3d',
                  boxShadow: isActive
                    ? `0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px ${feature.color}40`
                    : '0 10px 30px rgba(0, 0, 0, 0.2)',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {/* Card Content */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}>
                  {/* Icon */}
                  <motion.div
                    animate={{
                      rotate: isActive ? [0, 5, -5, 0] : 0,
                    }}
                    transition={{
                      duration: 2,
                      repeat: isActive ? Infinity : 0,
                    }}
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '2rem',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <feature.icon size={40} color="#fff" />
                  </motion.div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '1rem',
                  }}>
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: '1.125rem',
                    color: '#475569',
                    lineHeight: '1.7',
                    flex: 1,
                  }}>
                    {feature.description}
                  </p>

                  {/* Image Placeholder */}
                  <div style={{
                    marginTop: '2rem',
                    width: '100%',
                    height: '150px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.75rem',
                    }}>
                      [Feature Illustration {index + 1}]
                      <br />
                      Image Placeholder
                    </div>
                  </div>
                </div>

                {/* Card Number */}
                <div style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  backdropFilter: 'blur(10px)',
                }}>
                  {index + 1}
                </div>

                {/* Glassmorphism overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  pointerEvents: 'none',
                }} />
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '4rem',
        }}>
          {features.map((feature, index) => (
            <motion.button
              key={index}
              onClick={() => setActiveCard(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="hoverable"
              style={{
                width: activeCard === index ? '40px' : '12px',
                height: '12px',
                borderRadius: '6px',
                background: activeCard === index ? feature.gradient : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
