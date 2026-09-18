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

      const scale = isHovering ? 0.65 : 1;
      const opacity = isVisible ? (isHovering ? 0.8 : 0.35) : 0;
      // When hovering, intensify the glow
      const dropShadow = isHovering 
        ? 'drop-shadow(0 0 6px rgba(110,156,203,0.7))' 
        : 'drop-shadow(0 0 2px rgba(110,156,203,0.3))';

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
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-experiment"
      >
        {/* Hexagon frame */}
        <path
          d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeOpacity="0.8"
        />
        {/* Center dot — the proof point */}
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}
