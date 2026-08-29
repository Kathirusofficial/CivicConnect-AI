import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Mouse tracking glow
const MouseGlow = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-300"
      style={{
        background: `radial-gradient(1200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(147,51,234,0.06), transparent 40%)`,
      }}
    />
  );
};

const NoiseOverlay = () => (
  <div 
    className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.02] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat'
    }}
  />
);

const SmartGrid = () => (
  <div 
    className="pointer-events-none fixed inset-0 z-[0] opacity-[0.03]"
    style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
      backgroundSize: '100px 100px',
      backgroundPosition: 'center center'
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-[#090510] via-transparent to-[#090510] opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#090510] via-transparent to-[#090510] opacity-80" />
  </div>
);

const GradientBlobs = () => (
  <div className="pointer-events-none fixed inset-0 z-[0] overflow-hidden">
    <motion.div
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.9, 1],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#9333EA] opacity-[0.08] blur-[150px]"
    />
    <motion.div
      animate={{
        x: [0, -100, 50, 0],
        y: [0, 150, -50, 0],
        scale: [1, 1.3, 0.8, 1],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#2563EB] opacity-[0.06] blur-[180px]"
    />
    <motion.div
      animate={{
        x: [0, 150, -100, 0],
        y: [0, -50, 100, 0],
        scale: [1, 0.9, 1.1, 1],
      }}
      transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#06B6D4] opacity-[0.05] blur-[140px]"
    />
  </div>
);

const NetworkNodes = () => (
  <div className="pointer-events-none fixed inset-0 z-[0] overflow-hidden opacity-[0.15]">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop stopColor="#9333EA" stopOpacity="1" offset="0%" />
          <stop stopColor="#9333EA" stopOpacity="0" offset="100%" />
        </radialGradient>
      </defs>
      
      {/* City network lines */ }
      <motion.g
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M 10 200 L 300 150 L 500 250 L 800 100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M 200 600 L 400 450 L 600 550 L 900 400" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
        <path d="M 800 600 L 1000 350 L 1300 450 L 1600 300" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        
        {/* Nodes */ }
        <circle cx="300" cy="150" r="4" fill="#06B6D4" />
        <circle cx="500" cy="250" r="3" fill="#9333EA" />
        <circle cx="800" cy="100" r="5" fill="#2563EB" />
        <circle cx="400" cy="450" r="4" fill="#9333EA" />
        <circle cx="600" cy="550" r="3" fill="#06B6D4" />
        <circle cx="1000" cy="350" r="5" fill="#2563EB" />
      </motion.g>
    </svg>
  </div>
);

const FloatingParticles = () => {
  const particles = Array.from({ length: 30 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[0] overflow-hidden">
      {particles.map((_, i) => {
        const size = Math.random() * 4 + 1;
        const initialX = Math.random() * 100;
        const initialY = Math.random() * 100;
        const duration = Math.random() * 20 + 20;
        
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{
              width: size,
              height: size,
              left: `${initialX}%`,
              top: `${initialY}%`,
              opacity: Math.random() * 0.15 + 0.05,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.05, Math.random() * 0.2 + 0.1, 0.05]
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * -20
            }}
          />
        );
      })}
    </div>
  );
};

const CitySkyline = () => (
  <div className="pointer-events-none fixed bottom-0 inset-x-0 h-48 z-[0] opacity-[0.03]">
    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,100 L0,80 L20,80 L20,60 L40,60 L40,90 L60,90 L60,50 L90,50 L90,85 L120,85 L120,40 L160,40 L160,70 L200,70 L200,20 L240,20 L240,80 L280,80 L280,45 L320,45 L320,70 L350,70 L350,30 L400,30 L400,85 L440,85 L440,55 L480,55 L480,90 L520,90 L520,40 L560,40 L560,70 L600,70 L600,25 L650,25 L650,80 L690,80 L690,45 L730,45 L730,75 L780,75 L780,35 L820,35 L820,90 L860,90 L860,50 L900,50 L900,70 L930,70 L930,40 L970,40 L970,80 L1000,80 L1000,100 Z" fill="white" />
    </svg>
  </div>
);

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none bg-[#090510] z-[-1]">
      <SmartGrid />
      <NetworkNodes />
      <GradientBlobs />
      <FloatingParticles />
      <MouseGlow />
      <CitySkyline />
      <NoiseOverlay />
    </div>
  );
};
