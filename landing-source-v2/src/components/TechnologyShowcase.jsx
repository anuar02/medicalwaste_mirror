import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Cpu, Battery, Wifi, Thermometer, MapPin, Shield } from 'lucide-react';

const techSpecs = [
  {
    icon: Cpu,
    label: 'ESP32 Dual-Core',
    description: '240 MHz processor with WiFi & Bluetooth',
    position: { x: -150, y: -50 },
  },
  {
    icon: Battery,
    label: 'Long Battery Life',
    description: 'Up to 6 months on single charge',
    position: { x: 150, y: -50 },
  },
  {
    icon: Wifi,
    label: '4G/WiFi Connectivity',
    description: 'Reliable data transmission',
    position: { x: -150, y: 100 },
  },
  {
    icon: Thermometer,
    label: 'Multi-Sensor Array',
    description: 'Temperature, fill level, GPS',
    position: { x: 150, y: 100 },
  },
];

export default function TechnologyShowcase() {
  const containerRef = useRef(null);
  const [isExploded, setIsExploded] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotateY = useTransform(scrollYProgress, [0.2, 0.8], [0, 360]);

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
      {/* Background Gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
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
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '50px',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: '#8b5cf6', fontSize: '0.875rem', fontWeight: '500' }}>
              Advanced Technology
            </span>
          </motion.div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Meet the ESP32 Sensor
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            Cutting-edge IoT hardware engineered for reliability, precision, and long-term performance
          </p>
        </motion.div>

        {/* 3D Device Showcase */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '600px',
          position: 'relative',
          perspective: '2000px',
        }}>
          {/* Central Device */}
          <motion.div
            style={{
              position: 'relative',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Main Device Container */}
            <motion.div
              animate={{
                rotateY: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              whileHover={{ scale: 1.05 }}
              style={{
                width: '400px',
                height: '500px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                borderRadius: '20px',
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(139, 92, 246, 0.15)',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
            >
              {/* Device Icon Placeholder */}
              <Cpu size={120} color="#8b5cf6" style={{ opacity: 0.2 }} />
              
              <div style={{
                position: 'absolute',
                bottom: '2rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '0 2rem',
              }}>
                [3D ESP32 Device - Assembled View]
                <br />
                Image Placeholder
              </div>

              {/* Glowing particles around device */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.25,
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '8px',
                    height: '8px',
                    background: '#8b5cf6',
                    borderRadius: '50%',
                    transform: `rotate(${i * 30}deg) translateX(180px)`,
                    boxShadow: '0 0 20px #8b5cf6',
                  }}
                />
              ))}
            </motion.div>

            {/* Tech Spec Labels */}
            {techSpecs.map((spec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${spec.position.x}px)`,
                  top: `calc(50% + ${spec.position.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  willChange: 'transform',
                }}
              >
                {/* Connector Line */}
                <motion.div
                  style={{
                    position: 'absolute',
                    width: '2px',
                    height: Math.sqrt(spec.position.x ** 2 + spec.position.y ** 2),
                    background: 'linear-gradient(180deg, #8b5cf6 0%, transparent 100%)',
                    transformOrigin: 'top',
                    transform: `rotate(${Math.atan2(spec.position.y, spec.position.x) * 180 / Math.PI + 90}deg)`,
                    top: 0,
                    left: '50%',
                    zIndex: -1,
                  }}
                />

                {/* Label Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem 1.5rem',
                  backdropFilter: 'blur(10px)',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                  }}>
                    <spec.icon size={20} color="#8b5cf6" />
                    <span style={{
                      color: '#0f172a',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}>
                      {spec.label}
                    </span>
                  </div>
                  <p style={{
                    color: '#64748b',
                    fontSize: '0.75rem',
                    margin: 0,
                  }}>
                    {spec.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Exploded View Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          viewport={{ once: true }}
          style={{
            marginTop: '6rem',
            textAlign: 'center',
          }}
        >
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '2rem',
          }}>
            Internal Components
          </h3>

          {/* Exploded View Placeholder */}
          <div style={{
            width: '100%',
            maxWidth: '900px',
            height: '400px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
            borderRadius: '20px',
            border: '2px dashed rgba(139, 92, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Shield size={100} color="#8b5cf6" style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <div style={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              [ESP32 Exploded View with Components]
              <br />
              Image Placeholder
            </div>
          </div>

          {/* Component Grid */}
          <div style={{
            marginTop: '3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
          }}>
            {[
              { icon: Cpu, name: 'ESP32 Microcontroller', desc: 'Dual-core 240MHz' },
              { icon: Battery, name: 'Li-Po Battery', desc: '3000mAh capacity' },
              { icon: MapPin, name: 'GPS Module', desc: 'Sub-meter accuracy' },
              { icon: Thermometer, name: 'Sensor Array', desc: 'Multi-parameter monitoring' },
            ].map((component, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <component.icon size={40} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                <h4 style={{
                  color: '#0f172a',
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                }}>
                  {component.name}
                </h4>
                <p style={{
                  color: '#64748b',
                  fontSize: '0.875rem',
                  margin: 0,
                }}>
                  {component.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
