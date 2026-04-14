// Motion tokens — keep animations purposeful and short. Drivers should not
// wait on transitions. Use reanimated's withSpring/withTiming with these.

export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 320,
  },
  spring: {
    // Soft entrance for cards and sheets
    soft: { damping: 18, stiffness: 180, mass: 0.9 },
    // Snappy for taps and toggles
    snap: { damping: 22, stiffness: 280, mass: 0.8 },
  },
} as const;
