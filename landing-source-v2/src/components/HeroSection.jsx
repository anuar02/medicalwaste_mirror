import { useEffect, useRef, useState, Suspense } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, PerspectiveCamera, Float, MeshTransmissionMaterial } from '@react-three/drei';
import { ArrowRight, Activity, Radio, MapPin, Zap, Shield, BarChart3 } from 'lucide-react';
import * as THREE from 'three';

// Animated 3D particles around the model
function FloatingParticles() {
    const particlesRef = useRef();
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#eab308"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
}

// Rotating rings around the model
function RotatingRings() {
    const ring1Ref = useRef();
    const ring2Ref = useRef();
    const ring3Ref = useRef();

    useFrame((state) => {
        if (ring1Ref.current) ring1Ref.current.rotation.z = state.clock.elapsedTime * 0.3;
        if (ring2Ref.current) ring2Ref.current.rotation.z = -state.clock.elapsedTime * 0.2;
        if (ring3Ref.current) ring3Ref.current.rotation.x = state.clock.elapsedTime * 0.25;
    });

    return (
        <>
            <mesh ref={ring1Ref} position={[0, 0, 0]}>
                <torusGeometry args={[2.5, 0.02, 16, 100]} />
                <meshBasicMaterial color="#eab308" transparent opacity={0.3} />
            </mesh>
            <mesh ref={ring2Ref} position={[0, 0, 0]}>
                <torusGeometry args={[3, 0.015, 16, 100]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.2} />
            </mesh>
            <mesh ref={ring3Ref} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2, 0.02, 16, 100]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.25} />
            </mesh>
        </>
    );
}

// Energy pulses
function EnergyPulses({ scrollProgress }) {
    const pulseRef = useRef();

    useFrame((state) => {
        if (pulseRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
            pulseRef.current.scale.set(pulse, pulse, pulse);
            pulseRef.current.material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <mesh ref={pulseRef}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.1} wireframe />
        </mesh>
    );
}

function ContainerModel({ scrollProgress }) {
    const { scene } = useGLTF('/Meshy_AI_Yellow_Robot_Bin_1222234609_texture.glb');
    const groupRef = useRef();
    const glowRef = useRef();

    useFrame((state) => {
        if (groupRef.current) {
            // Rotation based on scroll
            groupRef.current.rotation.y = scrollProgress * Math.PI * 4;

            // Zoom/scale effect
            const scale = (1 + (scrollProgress * 0.5)) * 1.5;  // Multiply by 1.5 for 50% bigger
            groupRef.current.scale.set(scale, scale, scale);

            // Subtle floating animation
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        }

        // Pulsing glow effect
        if (glowRef.current) {
            const glowIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
            glowRef.current.material.opacity = glowIntensity;
        }
    });

    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
            });

            const box = new THREE.Box3().setFromObject(scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            scene.position.set(-center.x, -center.y, -center.z);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 10 / maxDim;
            scene.scale.set(scale, scale, scale);
        }
    }, [scene]);

    return (
        <group ref={groupRef}>
            <primitive object={scene} />
            {/* Glow sphere around model */}

        </group>
    );
}

function Scene3D({ scrollProgress }) {
    return (
        <Canvas
            style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
            }}
            camera={{ position: [0, 0, 8], fov: 50 }}
        >
            <ambientLight intensity={2} />
            <directionalLight position={[10, 10, 10]} intensity={2} />
            <directionalLight position={[-10, -10, -10]} intensity={1} />
            <pointLight position={[0, 5, 0]} intensity={1.5} />

            <Suspense fallback={null}>
                <ContainerModel scrollProgress={scrollProgress} />
                <FloatingParticles />
                <RotatingRings />
                <EnergyPulses scrollProgress={scrollProgress} />
            </Suspense>

            <Environment preset="sunset" />
        </Canvas>
    );
}

export default function HeroSection() {
    const containerRef = useRef(null);
    const deviceRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const { scrollYProgress: deviceScroll } = useScroll({
        target: deviceRef,
        offset: ['start center', 'end center'],
    });

    // Smooth spring animations
    const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
    const opacity = useSpring(useTransform(scrollYProgress, [0, 0.3], [1, 0]), springConfig);
    const scale = useSpring(useTransform(scrollYProgress, [0, 0.3], [1, 0.8]), springConfig);
    const y = useSpring(useTransform(scrollYProgress, [0, 0.3], [0, -100]), springConfig);

    const [scrollValue, setScrollValue] = useState(0);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const unsubscribe = deviceScroll.on('change', (latest) => {
            setScrollValue(latest);
        });
        return () => unsubscribe();
    }, [deviceScroll]);

    // Mouse parallax effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Enhanced particle animation with mouse interaction
    useEffect(() => {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = 150;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3 + 1;
                this.baseSpeedX = Math.random() * 0.5 - 0.25;
                this.baseSpeedY = Math.random() * 0.5 - 0.25;
                this.speedX = this.baseSpeedX;
                this.speedY = this.baseSpeedY;
                this.density = Math.random() * 30 + 1;
            }

            update(mouseX, mouseY) {
                // Mouse interaction
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const maxDistance = 150;
                const force = (maxDistance - distance) / maxDistance;

                if (distance < maxDistance) {
                    this.speedX -= forceDirectionX * force * this.density * 0.002;
                    this.speedY -= forceDirectionY * force * this.density * 0.002;
                } else {
                    this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
                    this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
                }

                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }

            draw() {
                ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        let mouse = { x: undefined, y: undefined };

        canvas.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        canvas.addEventListener('mouseout', () => {
            mouse.x = undefined;
            mouse.y = undefined;
        });

        function connectParticles() {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.strokeStyle = `rgba(234, 179, 8, ${0.3 * (1 - distance / 120)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((particle) => {
                particle.update(mouse.x, mouse.y);
                particle.draw();
            });
            connectParticles();
            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', () => {});
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.3,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 15,
            },
        },
    };

    // Character-by-character animation for title
    const titleText = "Transform Medical Waste Management with IoT";
    const words = titleText.split(' ');

    return (
        <section
            ref={containerRef}
            style={{
                position: 'relative',
                minHeight: '170vh',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#ffffff',
                paddingTop: '5rem',
            }}
        >
            {/* Interactive Particle Canvas */}
            <canvas
                id="particle-canvas"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                    zIndex: 0,
                }}
            />

            {/* Animated Gradient Background */}
            <motion.div
                animate={{
                    background: [
                        'radial-gradient(circle at 30% 50%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)',
                        'radial-gradient(circle at 70% 50%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)',
                        'radial-gradient(circle at 30% 50%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)',
                    ],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
                {/* Hero Text Content with Parallax */}
                <motion.div
                    style={{
                        opacity,
                        scale,
                        y,
                        x: mousePosition.x * 0.5,
                    }}
                >
                    <div style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                        padding: '0 2rem',
                        textAlign: 'center',
                    }}>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* Badge with shimmer effect */}
                            <motion.div variants={itemVariants}>
                                <motion.div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1.5rem',
                                        background: 'rgba(234, 179, 8, 0.1)',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                        borderRadius: '50px',
                                        marginBottom: '2rem',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {/* Shimmer effect */}
                                    <motion.div
                                        animate={{
                                            x: ['-100%', '200%'],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatDelay: 3,
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '50%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                        }}
                                    />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Activity size={16} color="#eab308" />
                                    </motion.div>
                                    <span style={{ color: '#eab308', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Real-time IoT Tracking Platform
                                    </span>
                                </motion.div>
                            </motion.div>

                            {/* Animated Title - word by word */}
                            <motion.h1
                                style={{
                                    fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                                    fontWeight: '800',
                                    marginBottom: '1.5rem',
                                    lineHeight: '1.1',
                                }}>
                                {words.map((word, wordIndex) => (
                                    <motion.span
                                        key={wordIndex}
                                        variants={{
                                            hidden: { opacity: 0, y: 50, rotateX: -90 },
                                            visible: {
                                                opacity: 1,
                                                y: 0,
                                                rotateX: 0,
                                                transition: {
                                                    delay: wordIndex * 0.1,
                                                    duration: 0.8,
                                                    type: 'spring',
                                                    stiffness: 100,
                                                },
                                            },
                                        }}
                                        style={{
                                            display: 'inline-block',
                                            marginRight: '0.3em',
                                            background: 'linear-gradient(135deg, #0f172a 0%, #eab308 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </motion.h1>

                            <motion.p
                                variants={itemVariants}
                                style={{
                                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                    color: '#64748b',
                                    maxWidth: '700px',
                                    margin: '0 auto 3rem',
                                    lineHeight: '1.6',
                                }}>
                                Track, monitor, and optimize medical waste disposal in real-time with our
                                ESP32-powered IoT sensors, GPS tracking, and intelligent analytics platform.
                            </motion.p>

                            {/* Animated Buttons */}
                            <motion.div
                                variants={itemVariants}
                                style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                }}>
                                <motion.button
                                    whileHover={{
                                        scale: 1.05,
                                        boxShadow: '0 0 30px rgba(234, 179, 8, 0.5)',
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={{
                                        boxShadow: [
                                            '0 0 0px rgba(234, 179, 8, 0)',
                                            '0 0 20px rgba(234, 179, 8, 0.3)',
                                            '0 0 0px rgba(234, 179, 8, 0)',
                                        ],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{
                                        padding: '1rem 2.5rem',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        border: 'none',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                    <motion.span
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        Get Started
                                    </motion.span>
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ArrowRight size={20} />
                                    </motion.div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        padding: '1rem 2.5rem',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#0f172a',
                                        background: 'rgba(15, 23, 42, 0.05)',
                                        border: '2px solid rgba(15, 23, 42, 0.1)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                    }}>
                                    Watch Demo
                                </motion.button>
                            </motion.div>

                            {/* Stats with count-up animation */}
                            <motion.div
                                variants={containerVariants}
                                style={{
                                    display: 'flex',
                                    gap: '3rem',
                                    justifyContent: 'center',
                                    marginTop: '5rem',
                                    flexWrap: 'wrap',
                                }}>
                                {[
                                    { icon: Radio, value: '99.9%', label: 'Uptime', color: '#eab308' },
                                    { icon: MapPin, value: '500+', label: 'Containers', color: '#10b981' },
                                    { icon: Activity, value: '24/7', label: 'Monitoring', color: '#3b82f6' },
                                ].map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        variants={itemVariants}
                                        style={{ textAlign: 'center' }}
                                        whileHover={{ scale: 1.1, y: -10 }}
                                    >
                                        <motion.div
                                            animate={{
                                                rotate: [0, 5, -5, 0],
                                                scale: [1, 1.1, 1],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                delay: index * 0.2,
                                            }}
                                        >
                                            <stat.icon size={32} color={stat.color} style={{ marginBottom: '0.5rem' }} />
                                        </motion.div>
                                        <motion.div
                                            style={{
                                                fontSize: '2rem',
                                                fontWeight: '700',
                                                color: '#0f172a',
                                                marginBottom: '0.25rem',
                                            }}
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 200,
                                                delay: index * 0.1 + 0.5,
                                            }}
                                        >
                                            {stat.value}
                                        </motion.div>
                                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                            {stat.label}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* 3D MODEL SECTION */}
                <div
                    ref={deviceRef}
                    style={{
                        marginTop: '10rem',
                        minHeight: '90vh',
                        position: 'relative',
                        background: 'linear-gradient(180deg, #ffffff 0%, #fefce8 100%)',
                    }}>
                    <div style={{
                        position: 'sticky',
                        top: '10vh',
                        width: '100%',
                        maxWidth: '1200px',
                        height: '80vh',
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {/* Animated Title */}
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            style={{
                                position: 'absolute',
                                top: '0',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                zIndex: 100,
                                textAlign: 'center',
                            }}>
                            Medical Waste Container - IoT Enabled
                        </motion.div>

                        {/* Animated Progress indicator */}
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                position: 'absolute',
                                top: '60px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '0.875rem',
                                color: '#64748b',
                                zIndex: 100,
                            }}>
                            <motion.span style={{ color: '#eab308', fontWeight: '600' }}>
                                {Math.round(scrollValue * 360 * 2)}°
                            </motion.span>
                            {' rotation'}
                        </motion.div>

                        {/* Bouncing Scroll hint */}
                        <motion.div
                            animate={{
                                y: [0, 10, 0],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '1rem',
                                color: '#eab308',
                                fontWeight: '600',
                                opacity: scrollValue < 0.3 ? 1 : 0,
                                transition: 'opacity 0.3s',
                                zIndex: 100,
                            }}>
                            ↓ Scroll to rotate and zoom ↓
                        </motion.div>

                        {/* 3D Model Container */}
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Scene3D scrollProgress={scrollValue} />

                            {/* Animated Glow effect */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '70%',
                                    height: '70%',
                                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, transparent 70%)',
                                    pointerEvents: 'none',
                                    filter: 'blur(60px)',
                                    zIndex: -1,
                                }}
                            />
                        </div>

                        {/* Feature Callouts with slide-in animation */}
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{
                                x: scrollValue > 0.2 && scrollValue < 0.5 ? 0 : -100,
                                opacity: scrollValue > 0.2 && scrollValue < 0.5 ? 1 : 0,
                                scale: scrollValue > 0.2 && scrollValue < 0.5 ? 1 : 0.8,
                            }}
                            transition={{ type: 'spring', stiffness: 100 }}
                            style={{
                                position: 'absolute',
                                top: '30%',
                                left: '5%',
                            }}>
                            <motion.div
                                whileHover={{ scale: 1.05, x: 10 }}
                                style={{
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    border: '2px solid rgba(234, 179, 8, 0.3)',
                                    maxWidth: '200px',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Zap size={16} color="#eab308" />
                                    <div style={{ fontSize: '0.875rem', color: '#eab308', fontWeight: '600' }}>
                                        ESP32 IoT Device
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    Real-time sensor monitoring
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{
                                x: scrollValue > 0.5 && scrollValue < 0.8 ? 0 : 100,
                                opacity: scrollValue > 0.5 && scrollValue < 0.8 ? 1 : 0,
                                scale: scrollValue > 0.5 && scrollValue < 0.8 ? 1 : 0.8,
                            }}
                            transition={{ type: 'spring', stiffness: 100 }}
                            style={{
                                position: 'absolute',
                                top: '30%',
                                right: '5%',
                            }}>
                            <motion.div
                                whileHover={{ scale: 1.05, x: -10 }}
                                style={{
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    border: '2px solid rgba(234, 179, 8, 0.3)',
                                    maxWidth: '200px',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={16} color="#10b981" />
                                    <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '600' }}>
                                        Pedal-Operated
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    Hands-free operation
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Additional callout */}
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{
                                y: scrollValue > 0.4 ? 0 : 100,
                                opacity: scrollValue > 0.4 ? 1 : 0,
                                scale: scrollValue > 0.4 ? 1 : 0.8,
                            }}
                            transition={{ type: 'spring', stiffness: 100 }}
                            style={{
                                position: 'absolute',
                                bottom: '10%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                            }}>
                            <motion.div
                                whileHover={{ scale: 1.05, y: -5 }}
                                style={{
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    border: '2px solid rgba(59, 130, 246, 0.3)',
                                    maxWidth: '220px',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart3 size={16} color="#3b82f6" />
                                    <div style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: '600' }}>
                                        Smart Analytics
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    AI-powered waste insights
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

useGLTF.preload('/Meshy_AI_Yellow_Robot_Bin_1222234609_texture.glb');