import React, { useEffect, useRef } from 'react';

/**
 * GreenElectroCanvas (Calming Edition)
 * 
 * Elegant, soothing green energy motion canvas.
 * Renders smooth, flowing harmonic energy tendrils, gentle luminous motes,
 * and a soft ambient aurora trail that gracefully responds to mouse movement
 * across the white content areas while strictly excluding:
 * - Top navbar
 * - Car brand marquee / logos / names
 * - All image elements & photo wraps
 * - Dark cards / footers
 */
export default function GreenElectroCanvas({ containerRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;

    // Smooth interpolated mouse position
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      rawClientX: -9999,
      rawClientY: -9999,
      speed: 0,
      active: false,
      insideAllowedArea: false,
      presence: 0, // 0 to 1 smooth fade
    };

    // Trailing mouse ribbon history for silky smooth ribbon
    const trail = [];
    const maxTrailLength = 18;

    // Calming floating ambient energy motes
    const nodeCount = 18;
    const nodes = [];

    // Gentle luminous spark particles
    const particles = [];
    const maxParticles = 40;

    // Resize handler
    const handleResize = () => {
      const parent = containerRef?.current || canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Initialize serene floating nodes
      if (nodes.length === 0 && width > 0 && height > 0) {
        for (let i = 0; i < nodeCount; i++) {
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25, // very slow, calm drift
            vy: (Math.random() - 0.5) * 0.25,
            baseRadius: 1.5 + Math.random() * 2.0,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.015 + Math.random() * 0.02,
            charge: 0,
          });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Helper: Check if screen coords hit excluded elements (navbar, logos, images, etc.)
    const isExcludedElement = (clientX, clientY) => {
      if (clientX < 0 || clientY < 0 || clientX > window.innerWidth || clientY > window.innerHeight) {
        return true;
      }

      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return false;

      const excludedSelector = [
        '.top-nav',
        '.hp-trust-bar',
        '.hp-brand-item',
        '.car-logo-svg',
        '.hp-hero',
        '.cta-block',
        '.site-footer',
        'img',
        'picture',
        '.hp-bento-img',
        '.hp-fleet-img-wrap',
        '.hp-human-img-wrap',
        '[data-electro-exclude="true"]'
      ].join(', ');

      return !!el.closest(excludedSelector);
    };

    // Helper: Check if local canvas point is inside excluded element
    const isLocalPointExcluded = (localX, localY) => {
      const parent = containerRef?.current || canvas.parentElement;
      if (!parent) return false;
      const rect = parent.getBoundingClientRect();
      return isExcludedElement(rect.left + localX, rect.top + localY);
    };

    // Mouse movement handler
    const handleMouseMove = (e) => {
      const parent = containerRef?.current || canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      mouse.rawClientX = e.clientX;
      mouse.rawClientY = e.clientY;

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const isInsideContainer = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;
      const isExcluded = isExcludedElement(e.clientX, e.clientY);

      if (isInsideContainer && !isExcluded) {
        if (mouse.targetX < -1000) {
          mouse.x = localX;
          mouse.y = localY;
        }
        mouse.targetX = localX;
        mouse.targetY = localY;
        mouse.active = true;
        mouse.insideAllowedArea = true;

        // Spawn a gentle, soft glowing particle on movement (low rate for calming feel)
        if (Math.random() < 0.35 && particles.length < maxParticles) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.4 + Math.random() * 0.8;
          particles.push({
            x: localX + (Math.random() - 0.5) * 6,
            y: localY + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 0.25, // gentle upward float
            life: 1.0,
            decay: 0.015 + Math.random() * 0.02,
            size: 1.5 + Math.random() * 1.8,
            hue: 158 + (Math.random() - 0.5) * 12, // calming emerald-mint
          });
        }
      } else {
        mouse.insideAllowedArea = false;
        mouse.active = false;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.insideAllowedArea = false;
    };

    const handleWindowScroll = () => {
      if (mouse.rawClientX > 0 && mouse.rawClientY > 0) {
        const parent = containerRef?.current || canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const localX = mouse.rawClientX - rect.left;
        const localY = mouse.rawClientY - rect.top;

        const isInsideContainer = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;
        const isExcluded = isExcludedElement(mouse.rawClientX, mouse.rawClientY);

        if (isInsideContainer && !isExcluded) {
          mouse.targetX = localX;
          mouse.targetY = localY;
          mouse.insideAllowedArea = true;
          mouse.active = true;
        } else {
          mouse.insideAllowedArea = false;
          mouse.active = false;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Draw a smooth, harmonic flowing energy curve (calming wave stream)
    const drawHarmonicStream = (x1, y1, x2, y2, time, intensity = 1.0) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) return;

      const angle = Math.atan2(dy, dx);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);

      const segments = 16;
      const step = dist / segments;

      // Pass 1: Soft ambient glow stream
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);

      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const currentDist = i * step;

        // Gentle sinusoidal harmonic undulation (slow & calming)
        const wave = Math.sin(t * Math.PI * 2.5 - time * 2.0) * Math.sin(t * Math.PI) * 12;
        const px = x1 + Math.cos(angle) * currentDist + nx * wave;
        const py = y1 + Math.sin(angle) * currentDist + ny * wave;

        ctx.lineTo(px, py);
      }
      ctx.lineTo(x2, y2);

      ctx.strokeStyle = `rgba(16, 185, 129, ${0.18 * intensity})`;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Pass 2: Elegant core stream line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);

      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const currentDist = i * step;
        const wave = Math.sin(t * Math.PI * 2.5 - time * 2.0) * Math.sin(t * Math.PI) * 12;
        const px = x1 + Math.cos(angle) * currentDist + nx * wave;
        const py = y1 + Math.sin(angle) * currentDist + ny * wave;

        ctx.lineTo(px, py);
      }
      ctx.lineTo(x2, y2);

      ctx.strokeStyle = `rgba(52, 211, 153, ${0.45 * intensity})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    };

    // Main animation loop
    let lastTime = performance.now();

    const render = (time) => {
      const timeSec = time * 0.001;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse position interpolation (buttery smooth lerp)
      if (mouse.targetX > -1000) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      }

      // Smooth presence fade (fade in / out gracefully)
      if (mouse.insideAllowedArea) {
        mouse.presence = Math.min(mouse.presence + dt * 3.0, 1.0);
      } else {
        mouse.presence = Math.max(mouse.presence - dt * 2.0, 0);
      }

      // Update trailing ribbon history
      if (mouse.presence > 0.05 && mouse.x > 0 && mouse.y > 0) {
        trail.unshift({ x: mouse.x, y: mouse.y, time: timeSec });
        if (trail.length > maxTrailLength) {
          trail.pop();
        }
      } else {
        trail.pop();
      }

      // 1. Update & Render Ambient Floating Energy Motes
      nodes.forEach((node) => {
        node.phase += node.pulseSpeed;
        node.x += node.vx;
        node.y += node.vy;

        // Wrap or bounce gently inside container bounds
        if (node.x < 30) { node.x = 30; node.vx *= -1; }
        if (node.x > width - 30) { node.x = width - 30; node.vx *= -1; }
        if (node.y < 30) { node.y = 30; node.vy *= -1; }
        if (node.y > height - 30) { node.y = height - 30; node.vy *= -1; }

        // Proximity calculation to smooth mouse
        let distToMouse = 9999;
        if (mouse.presence > 0.05) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          distToMouse = Math.sqrt(dx * dx + dy * dy);
        }

        // Smoothly charge up when mouse is near (< 180px)
        const proximityThreshold = 180;
        if (distToMouse < proximityThreshold && mouse.presence > 0.05) {
          const targetCharge = (1 - distToMouse / proximityThreshold) * mouse.presence;
          node.charge += (targetCharge - node.charge) * 0.08;
        } else {
          node.charge += (0 - node.charge) * 0.04;
        }

        // Check if node is in excluded area
        if (isLocalPointExcluded(node.x, node.y)) {
          node.charge = 0;
          return;
        }

        // Render gentle ambient aura & core mote
        const pulse = (Math.sin(node.phase) + 1) / 2;
        const radius = node.baseRadius + pulse * 1.0 + node.charge * 2.0;

        // Soft radial glow
        const glowRadius = radius * (4.0 + node.charge * 3.0);
        const moteGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
        moteGlow.addColorStop(0, `rgba(16, 185, 129, ${0.12 + node.charge * 0.25})`);
        moteGlow.addColorStop(0.5, `rgba(5, 150, 105, ${0.04 + node.charge * 0.1})`);
        moteGlow.addColorStop(1, 'rgba(5, 150, 105, 0)');

        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = moteGlow;
        ctx.fill();

        // Mote core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${0.4 + pulse * 0.25 + node.charge * 0.35})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6 + node.charge * 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 2. Render Calming Harmonic Energy Streams between Mouse and Charged Nodes
      if (mouse.presence > 0.05) {
        nodes.forEach((node) => {
          if (node.charge > 0.08) {
            drawHarmonicStream(mouse.x, mouse.y, node.x, node.y, timeSec, node.charge * mouse.presence);
          }
        });
      }

      // 3. Render Silky Smooth Mouse Motion Trail
      if (trail.length > 2 && mouse.presence > 0.05) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);

        for (let i = 1; i < trail.length - 1; i++) {
          const xc = (trail[i].x + trail[i + 1].x) / 2;
          const yc = (trail[i].y + trail[i + 1].y) / 2;
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        }

        ctx.strokeStyle = `rgba(52, 211, 153, ${0.18 * mouse.presence})`;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Update & Render Calming Floating Spark Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (isLocalPointExcluded(p.x, p.y)) {
          p.life -= 0.05;
          continue;
        }

        const alpha = Math.max(p.life, 0);
        const radius = p.size * (0.6 + alpha * 0.4);

        // Soft particle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.22})`;
        ctx.fill();

        // Soft particle core
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha * 0.65})`;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Ambient Cursor Aura (Soft, soothing radial halo)
      if (mouse.presence > 0.02 && mouse.x > 0 && mouse.y > 0) {
        const haloRadius = 60;
        const cursorGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, haloRadius);
        cursorGlow.addColorStop(0, `rgba(52, 211, 153, ${0.14 * mouse.presence})`);
        cursorGlow.addColorStop(0.5, `rgba(16, 185, 129, ${0.05 * mouse.presence})`);
        cursorGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = cursorGlow;
        ctx.fill();

        // Delicate, soft central light point
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * mouse.presence})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleWindowScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="green-electro-canvas"
      aria-hidden="true"
    />
  );
}
