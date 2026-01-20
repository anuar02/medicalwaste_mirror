import { motion } from 'framer-motion';
import { CheckCircle, DollarSign, Leaf, Brain, Shield, TrendingUp, Users, Zap } from 'lucide-react';

const benefits = [
  {
    icon: CheckCircle,
    title: 'Compliance Assured',
    description: 'Automated tracking and reporting ensures 100% adherence to medical waste regulations',
    stat: '100%',
    statLabel: 'Compliance Rate',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    size: 'large',
  },
  {
    icon: DollarSign,
    title: 'Cost Savings',
    description: 'Reduce operational costs by up to 85% through route optimization and predictive analytics',
    stat: '85%',
    statLabel: 'Cost Reduction',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    size: 'medium',
  },
  {
    icon: Leaf,
    title: 'Environmental Impact',
    description: 'Minimize carbon footprint with optimized collection routes and reduced waste',
    stat: '60%',
    statLabel: 'CO₂ Reduction',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    size: 'medium',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Machine learning algorithms predict optimal collection times and maintenance needs',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    size: 'small',
  },
  {
    icon: Shield,
    title: 'Data Security',
    description: 'Enterprise-grade encryption and multi-tenant isolation protect sensitive information',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    size: 'small',
  },
  {
    icon: TrendingUp,
    title: 'Scalable Growth',
    description: 'Easily expand operations across multiple facilities without infrastructure changes',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    size: 'small',
  },
  {
    icon: Users,
    title: 'Multi-Tenant Support',
    description: 'Manage multiple facilities with role-based access and isolated data streams',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    size: 'small',
  },
  {
    icon: Zap,
    title: 'Real-Time Alerts',
    description: 'Instant notifications for critical events, anomalies, and maintenance requirements',
    stat: '<1s',
    statLabel: 'Alert Speed',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    size: 'large',
  },
];

export default function BenefitsSection() {
  return (
    <section
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
        background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
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
              Why Choose Us
            </span>
          </motion.div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Transformative Benefits
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            Experience measurable improvements across compliance, costs, and environmental impact
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gridAutoFlow: 'dense',
          gap: '1.5rem',
        }}>
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.05,
                duration: 0.5,
                type: 'spring',
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.02,
                y: -5,
                transition: { duration: 0.2 },
              }}
              className="hoverable"
              style={{
                gridColumn: benefit.size === 'large' ? 'span 2' : 'span 1',
                gridRow: benefit.size === 'large' ? 'span 2' : 'span 1',
                background: benefit.gradient,
                borderRadius: '20px',
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                minHeight: benefit.size === 'large' ? '400px' : '280px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Glassmorphism Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                pointerEvents: 'none',
              }} />

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <benefit.icon size={30} color="#fff" />
                </motion.div>

                {/* Title */}
                <h3 style={{
                  fontSize: benefit.size === 'large' ? '2rem' : '1.5rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '1rem',
                }}>
                  {benefit.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '1rem',
                  color: '#475569',
                  lineHeight: '1.7',
                  flex: 1,
                }}>
                  {benefit.description}
                </p>

                {/* Stat (if available) */}
                {benefit.stat && (
                  <div style={{
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <div style={{
                      fontSize: benefit.size === 'large' ? '3rem' : '2.5rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '0.25rem',
                    }}>
                      {benefit.stat}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#64748b',
                      fontWeight: '500',
                    }}>
                      {benefit.statLabel}
                    </div>
                  </div>
                )}

                {/* Image Placeholder (for larger cards) */}
                {benefit.size === 'large' && (
                  <div style={{
                    marginTop: '1.5rem',
                    width: '100%',
                    height: '120px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
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
                      [Benefit Illustration]
                      <br />
                      Image Placeholder
                    </div>
                  </div>
                )}
              </div>

              {/* Hover effect particles */}
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
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -30, 0],
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
                      background: '#fff',
                      borderRadius: '50%',
                    }}
                  />
                ))}
              </motion.div>

              {/* Gradient border glow */}
              <div style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                right: '-2px',
                bottom: '-2px',
                borderRadius: '20px',
                background: benefit.gradient,
                opacity: 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none',
                zIndex: -1,
              }} 
              className="glow-border"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
