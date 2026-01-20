import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Building2, User, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    setIsSubmitted(true);
    
    // Reset after animation
    setTimeout(() => {
      setEmail('');
      setCompany('');
      setName('');
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '4rem 2rem',
        background: '#ffffff',
      }}
    >
      {/* Animated Gradient Mesh Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}>
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%), radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 50% 20%, #10b981 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.3,
          }}
        />

        {/* Floating Orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${100 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 200}px`,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#3b82f6' : '#8b5cf6',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '800px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Sparkles Icon */}
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              display: 'inline-block',
              marginBottom: '2rem',
            }}
          >
            <Sparkles size={60} color="#10b981" />
          </motion.div>

          {/* Heading */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: '800',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #10b981 50%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}>
            Ready to Transform Your
            <br />
            Waste Management?
          </h2>

          {/* Subheading */}
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            marginBottom: '3rem',
            lineHeight: '1.6',
          }}>
            Join healthcare facilities worldwide using IoT technology to reduce costs, 
            ensure compliance, and protect the environment.
          </p>

          {/* Form */}
          {!isSubmitted ? (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '3rem',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Input Fields */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                {/* Name Input */}
                <div style={{ position: 'relative' }}>
                  <User
                    size={20}
                    color="rgba(255, 255, 255, 0.5)"
                    style={{
                      position: 'absolute',
                      left: '1.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                      fontSize: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                </div>

                {/* Email Input */}
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={20}
                    color="rgba(255, 255, 255, 0.5)"
                    style={{
                      position: 'absolute',
                      left: '1.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Work Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                      fontSize: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                </div>

                {/* Company Input */}
                <div style={{ position: 'relative' }}>
                  <Building2
                    size={20}
                    color="rgba(255, 255, 255, 0.5)"
                    style={{
                      position: 'absolute',
                      left: '1.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Facility Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                      fontSize: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 0 50px rgba(16, 185, 129, 0.6)',
                }}
                whileTap={{ scale: 0.95 }}
                className="hoverable"
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span>Get Started Today</span>
                <ArrowRight size={24} />

                {/* Button shine effect */}
                <motion.div
                  animate={{
                    x: ['-200%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                    pointerEvents: 'none',
                  }}
                />
              </motion.button>

              {/* Trust indicators */}
              <div style={{
                marginTop: '2rem',
                fontSize: '0.875rem',
                color: '#64748b',
              }}>
                🔒 Your data is secure and will never be shared
              </div>
            </motion.form>
          ) : (
            // Success State
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid #10b981',
                borderRadius: '20px',
                padding: '4rem',
                backdropFilter: 'blur(20px)',
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 0.6,
                }}
                style={{
                  display: 'inline-block',
                  marginBottom: '1.5rem',
                }}
              >
                <Sparkles size={80} color="#10b981" />
              </motion.div>
              <h3 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '1rem',
              }}>
                Thank You!
              </h3>
              <p style={{
                fontSize: '1.125rem',
                color: '#64748b',
              }}>
                We'll be in touch shortly to discuss how MedicalWaste.kz can transform your operations.
              </p>

              {/* Confetti effect */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{
                    y: -300,
                    x: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.02,
                    ease: 'easeOut',
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '10px',
                    height: '10px',
                    background: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4],
                    borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
