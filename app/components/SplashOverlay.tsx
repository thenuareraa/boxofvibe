'use client';
import { useEffect, useState } from 'react';

export default function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade-out after 2.2 seconds
    const fadeTimer = setTimeout(() => setFading(true), 2200);
    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => setVisible(false), 2800);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        transition: 'opacity 0.6s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Spinning vinyl */}
      <div className="vinyl-spin" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="sp-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#000000" stopOpacity="0"/>
              <stop offset="76%" stopColor="#000000" stopOpacity="0"/>
              <stop offset="84%" stopColor="#A855F7" stopOpacity="0.7"/>
              <stop offset="92%" stopColor="#EC4899" stopOpacity="1"/>
              <stop offset="100%" stopColor="#FB923C" stopOpacity="1"/>
            </radialGradient>
            <radialGradient id="sp-label" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#A855F7"/>
              <stop offset="50%"  stopColor="#EC4899"/>
              <stop offset="100%" stopColor="#FB923C"/>
            </radialGradient>
          </defs>
          {/* Glow ring */}
          <circle cx="50" cy="50" r="49" fill="url(#sp-glow)"/>
          {/* Vinyl body */}
          <circle cx="50" cy="50" r="44" fill="#0D0D0D"/>
          {/* Grooves */}
          <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8"/>
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8"/>
          <circle cx="50" cy="50" r="29" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8"/>
          <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8"/>
          {/* Centre label */}
          <circle cx="50" cy="50" r="18" fill="url(#sp-label)"/>
          {/* Centre hole */}
          <circle cx="50" cy="50" r="4"  fill="#000000"/>
        </svg>
      </div>

      {/* BoxOfVibe text */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'linear-gradient(135deg, #A855F7, #EC4899, #FB923C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          BoxOfVibe
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.15em',
            marginTop: 4,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          YOUR MUSIC UNIVERSE
        </div>
      </div>
    </div>
  );
}
