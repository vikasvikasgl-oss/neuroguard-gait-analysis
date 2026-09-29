import React from 'react';

export default function NeurologicalBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#0B0F19',
        overflow: 'hidden',
      }}
    >
      {/* Ambient breathing radial orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '30%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.09) 0%, transparent 70%)',
          animation: 'ambientGlow 8s ease-in-out infinite alternate',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '10%',
          width: '45vw',
          height: '45vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.35) 0%, transparent 70%)',
          animation: 'ambientGlow 10s ease-in-out infinite alternate-reverse',
          filter: 'blur(50px)',
        }}
      />

      {/* Clean subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
        }}
      />
    </div>
  );
}
