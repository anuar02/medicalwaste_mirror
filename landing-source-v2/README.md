# MedicalWaste.kz - Ultra-Modern Landing Page

An immersive, next-generation landing page built with React, Framer Motion, and GSAP featuring scroll-driven animations, parallax effects, and 3D transforms.

## 🚀 Features

- **Smooth Scroll**: Lenis-powered buttery smooth scrolling with momentum
- **Custom Cursor**: Magnetic cursor effects with hover interactions
- **Scroll Progress**: Visual progress indicator with section waypoints
- **10 Immersive Sections**:
  1. Hero with particle network background
  2. Problem/Solution split-screen morph
  3. 3D floating card carousel for features
  4. Animated journey timeline
  5. 3D product showcase with exploded view
  6. Dashboard preview with morphing interface
  7. Bento grid benefits section
  8. Infinite stats ticker
  9. Final CTA with animated gradient mesh
  10. Footer

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🎨 Image Placeholders Guide

The landing page contains **9 image placeholder sections**. Replace these with your Banana Pro generated images:

### 1. Hero Section - ESP32 Device (600x400px)
**File**: `src/components/HeroSection.jsx` ~line 180
**Prompt**: Ultra-realistic 3D render of ESP32 microcontroller on white medical waste container

### 2. Problem Scene (100%x250px)
**File**: `src/components/ProblemSolutionSection.jsx` ~line 80
**Prompt**: Chaotic medical facility illustration

### 3. Solution Dashboard (100%x250px)
**File**: `src/components/ProblemSolutionSection.jsx` ~line 180
**Prompt**: Clean modern dashboard interface

### 4-6. Feature Illustrations (100%x150px each)
**File**: `src/components/FeaturesSection.jsx` (inside cards)
**Prompts**: ESP32 sensors, GPS tracking, Multi-tenant architecture

### 7-10. Journey Scenes (100%x180px each)
**File**: `src/components/HowItWorksSection.jsx` (4 step cards)
**Prompt**: Connected journey from installation to dashboard

### 11-12. Technology Device (400x500px + 900x400px)
**File**: `src/components/TechnologyShowcase.jsx`
**Prompts**: Assembled ESP32 view + Exploded component view

### 13-15. Dashboard Screenshots (100%x500px each)
**File**: `src/components/DashboardPreview.jsx` (3 views)
**Prompts**: Map view, Analytics view, Monitoring view

### 16. Benefits (optional, 100%x120px)
**File**: `src/components/BenefitsSection.jsx`
**Prompt**: Benefit icon illustrations

## 🎯 How to Add Your Images

1. Generate images using Banana Pro
2. Create `/public/images/` folder
3. Replace placeholder divs with `<img>` tags:

```jsx
// Before (placeholder):
<div style={{ /* placeholder styles */ }}>
  [Image Placeholder]
</div>

// After (your image):
<img 
  src="/images/your-image.png" 
  alt="Description"
  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
/>
```

## 🎨 Color Scheme

- Primary: #10b981 (Green)
- Secondary: #3b82f6 (Blue)  
- Accent: #8b5cf6 (Purple)
- Dark: #0f172a (Navy)

## 🛠 Tech Stack

- React 18 + Vite
- Framer Motion (animations)
- GSAP ScrollTrigger
- Lenis (smooth scroll)
- Lucide React (icons)

## ⚡ Performance

- GPU-accelerated transforms
- 60fps animations
- Lazy loading
- Optimized scrolling

## 🚀 Deployment

```bash
npm run build
# Upload dist/ folder to your server
```

## 📝 Customization

### Colors
Edit `src/index.css`:
```css
:root {
  --color-primary: #10b981;
  /* ... */
}
```

### Animation Speed
Modify `App.jsx` Lenis config:
```js
duration: 1.2 // seconds
```

---

**Built for MedicalWaste.kz IoT Platform**
