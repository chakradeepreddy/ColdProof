'use client';

import { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable on touch devices and if user prefers reduced motion
    const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isTouch || prefersReducedMotion) return;

    const el = cursorRef.current;
    if (!el) return;

    // Start slightly off-screen or center, but invisible
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let isVisible = false;
    let isHovering = false;

    const update = () => {
      // Smooth lerp for delayed tracking physical feel
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;

      const scale = isHovering ? 0.6 : 1;
      const opacity = isVisible ? (isHovering ? 0.7 : 0.3) : 0;
      // When hovering, intensify the glow
      const dropShadow = isHovering 
        ? 'drop-shadow(0 0 4px rgba(110,156,203,0.5))' 
        : 'drop-shadow(0 0 1px rgba(110,156,203,0.2))';

      el.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%) scale(${scale})`;
      el.style.opacity = opacity.toString();
      el.style.filter = dropShadow;

      requestAnimationFrame(update);
    };

    const rafId = requestAnimationFrame(update);

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) isVisible = true;

      // Check if hovering over an interactive element
      const target = e.target as HTMLElement;
      if (target) {
        isHovering = !!target.closest('a, button, input, textarea, select, [role="button"], [tabindex="0"], label');
      }
    };

    const onMouseEnter = () => { isVisible = true; };
    const onMouseLeave = () => { isVisible = false; };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:flex items-center justify-center transition-[opacity,filter] duration-300"
      style={{ opacity: 0, willChange: 'transform, opacity, filter' }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-experiment"
      >
        {/* Crosshair lines — calibration instrument feel */}
        <line x1="16" y1="0" x2="16" y2="11" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="16" y1="21" x2="16" y2="32" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="0" y1="16" x2="11" y2="16" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="21" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />

        {/* Hexagon frame — slightly smaller within the crosshair */}
        <path
          d="M16 6L23 10.5V21.5L16 26L9 21.5V10.5L16 6Z"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeOpacity="0.6"
        />
        {/* Center dot — the proof point */}
        <circle cx="16" cy="16" r="1.2" fill="currentColor" fillOpacity="0.8" />

        {/* Tiny tick marks on crosshairs */}
        <line x1="14.5" y1="4" x2="17.5" y2="4" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" />
        <line x1="14.5" y1="28" x2="17.5" y2="28" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" />
        <line x1="4" y1="14.5" x2="4" y2="17.5" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" />
        <line x1="28" y1="14.5" x2="28" y2="17.5" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" />
      </svg>
    </div>
  );
}
