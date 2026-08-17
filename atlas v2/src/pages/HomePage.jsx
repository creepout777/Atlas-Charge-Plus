import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, MapPin, Clock, Shield, Truck, BatteryCharging, Star, ArrowRight, Sparkles, ChevronDown, Users, Globe, Gauge } from 'lucide-react';
import GreenElectroCanvas from '../components/shared/GreenElectroCanvas';
import { useData } from '../context/DataContext.jsx';

/* ── Intersection Observer for scroll-triggered reveals ── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('revealed'); observer.unobserve(el); } },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = '', style = {} }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`scroll-reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>{children}</div>;
}

/* ── Animated counter hook ── */
function useCounter(target, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.unobserve(el);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, startOnView]);

  return { count, ref };
}

/* ── Rotating text with synchronized entrance & exit animation ── */
function RotatingText({ phrases, interval = 3000 }) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((curr) => {
        setPrevIndex(curr);
        setAnimating(true);
        return (curr + 1) % phrases.length;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  useEffect(() => {
    if (animating) {
      const timeout = setTimeout(() => {
        setAnimating(false);
        setPrevIndex(null);
      }, 550);
      return () => clearTimeout(timeout);
    }
  }, [animating]);

  return (
    <span className="hp-rotating-box">
      {prevIndex !== null && animating && (
        <span className="hp-rotating-word hp-rotating-exit" key={`exit-${prevIndex}`}>
          <span className="hp-gradient-text">{phrases[prevIndex]}</span>
        </span>
      )}
      <span
        className={`hp-rotating-word ${animating ? 'hp-rotating-enter' : 'hp-rotating-active'}`}
        key={`enter-${index}`}
      >
        <span className="hp-gradient-text">{phrases[index]}</span>
      </span>
    </span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { reviews } = useData();
  const [scrollProgress, setScrollProgress] = useState(0);
  const whiteAreaRef = useRef(null);

  // Auto-rotating hero images
  const heroImages = ['/hero-truck.jpg', '/hero-night.jpg', '/hero-fleet.jpg'];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Counters
  const kw = useCounter(150, 1800);
  const sessions = useCounter(12847, 2200);
  const rating = useCounter(49, 1600); // 4.9 -> show as /10 scaled
  const cities = useCounter(32, 1400);

  // Rotating phrases for hero headline
  const phrases = [
    'delivered to you.',
    'wherever you park.',
    'direct to your EV.',
    'on your driveway.',
    'at your workplace.',
    'anywhere in London.'
  ];

  return (
    <div className="homepage">

      {/* ═══════════════════════════════════════════════ */}
      {/*  HERO — Full-width cinematic with auto-fade    */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="hp-hero" data-electro-exclude="true">
        {/* Background image carousel with crossfade */}
        <div className="hp-hero-bg">
          {heroImages.map((src, i) => (
            <img key={src} src={src} alt="" className={`hp-hero-bg-img ${i === heroIdx ? 'active' : ''}`} data-electro-exclude="true" />
          ))}
          <div className="hp-hero-bg-overlay" />
        </div>

        <div className="hp-hero-inner">
          <div className="hp-hero-content">
            <Reveal delay={0}>
              <span className="hp-eyebrow">
                <Sparkles size={14} /> London's On-Demand Mobile EV Charging Fleet
              </span>
            </Reveal>

            <Reveal delay={120}>
              <h1 className="hp-hero-title">
                Rapid power,<br />
                <RotatingText phrases={phrases} interval={3000} />
              </h1>
            </Reveal>

            <Reveal delay={240}>
              <p className="hp-hero-desc">
                Atlas Charge Plus+ dispatches 150 kW mobile rapid-charging trucks directly to your electric vehicle — anywhere in Greater London. No queues. No cables. No range anxiety.
              </p>
            </Reveal>

            <Reveal delay={360}>
              <div className="hp-hero-actions">
                <button className="btn-hero-primary" onClick={() => navigate('/login')}>
                  Request a Charge <ArrowRight size={18} />
                </button>
                <button className="btn-hero-secondary" onClick={() => navigate('/tariffs')}>
                  View Pricing
                </button>
              </div>
            </Reveal>
          </div>


        </div>

        {/* Scroll indicator */}
        <div className="hp-scroll-hint">
          <ChevronDown size={20} />
        </div>
      </section>


      {/* ═══════════════════════════════════════════════ */}
      {/*  LOGO BAR — Social proof marquee with car logos */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="hp-trust-bar">
        <div className="hp-trust-inner">
          {[
            {
              name: 'Tesla',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M50 36.5c9.2 0 17.5 2.3 24.8 6.2l7.2-14.3C72 23.1 61.5 20.5 50 20.5c-11.5 0-22 2.6-32 7.9l7.2 14.3c7.3-3.9 15.6-6.2 24.8-6.2zm42-13.6C79.7 15.3 65.3 11.5 50 11.5c-15.3 0-29.7 3.8-42 11.4l-2 4 9.9 1.3c9.5-5.1 20.5-8 32.1-8s22.6 2.9 32.1 8l9.9-1.3-2-4zM50 46.4c-2.6 0-4.9.4-7 1.2l2.2 39.1h9.6l2.2-39.1c-2.1-.8-4.4-1.2-7-1.2z" />
                </svg>
              )
            },
            {
              name: 'Porsche',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 18h56c0 34-9 68-28 76C31 86 22 52 22 18z" fill="rgba(16,185,129,0.05)" />
                  <path d="M30 24h40v8H30z" fill="currentColor" stroke="none" />
                  <path d="M30 36h18v22H30zm22 0h18v22H52z" strokeWidth="2" />
                  <path d="M42 42h16v18c-4 6-8 10-8 14 0-4-4-8-8-14V42z" fill="currentColor" stroke="none" />
                </svg>
              )
            },
            {
              name: 'BMW',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path fill="currentColor" d="M50 20A30 30 0 0 1 80 50H50V20zM50 50v30A30 30 0 0 1 20 50h30z" />
                </svg>
              )
            },
            {
              name: 'Mercedes-EQ',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path fill="currentColor" d="M50 12L46 47.5 17 64.5l30.5-6.5L50 88l2.5-30 30.5 6.5L54 47.5z" />
                </svg>
              )
            },
            {
              name: 'Audi',
              icon: (
                <svg viewBox="0 0 110 40" className="car-logo-svg" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <circle cx="23" cy="20" r="14" />
                  <circle cx="44" cy="20" r="14" />
                  <circle cx="66" cy="20" r="14" />
                  <circle cx="87" cy="20" r="14" />
                </svg>
              )
            },
            {
              name: 'Polestar',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M48 14l-3.5 35h35l-15.5-15.5 15.5-15.5H51.5l-3.5-4zm4 72l3.5-35h-35l15.5 15.5-15.5 15.5h28l3.5 4z" />
                </svg>
              )
            },
            {
              name: 'Hyundai',
              icon: (
                <svg viewBox="0 0 100 65" className="car-logo-svg">
                  <ellipse cx="50" cy="32.5" rx="44" ry="26" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path fill="currentColor" d="M33 16h6.5l-5.5 33H27.5zm27.5 0H67l-5.5 33H55zm-26 18c9-4.5 24-4.5 33 0l-1.5 5.5c-9-3.5-22-3.5-30 0z" />
                </svg>
              )
            },
            {
              name: 'Kia',
              icon: (
                <svg viewBox="0 0 100 45" className="car-logo-svg" fill="currentColor">
                  <path d="M10 10h7v10.5l13-10.5h8.5L25.5 24.5 40 37h-8.5L17 24.5V37h-7zm34 0h7v27h-7zm12 0h26.5l-8.5 27h-7.5l4.5-15.5h-7l-3.5 15.5h-7.5z" />
                </svg>
              )
            },
            {
              name: 'Rivian',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M50 12l13 19-13 19-13-19zm0 38l13 19-13 19-13-19zm-24-19l13 19-13 19-13-19zm48 0l13 19-13 19-13-19z" />
                </svg>
              )
            },
            {
              name: 'Volvo',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="3.8" />
                  <path fill="currentColor" d="M72 18h15v15l-6.5-6.5-13 13-5.5-5.5 13-13z" />
                  <rect x="18" y="44" width="64" height="12" fill="currentColor" rx="2" />
                </svg>
              )
            },
            {
              name: 'Jaguar',
              icon: (
                <svg viewBox="0 0 110 50" className="car-logo-svg" fill="currentColor">
                  <path d="M8 32c12-8 24-16 40-16 12 0 24 6 36 3 8-2 15-8 20-13-2 8-8 14-16 17-14 4-28-1-42-1-14 0-26 5-38 10z" />
                  <path d="M72 23c6-2 12 1 18-2 4-2 7-6 9-10-1 6-5 10-11 12-6 2-11 0-16 0z" />
                </svg>
              )
            }
          ].concat([
            {
              name: 'Tesla',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M50 36.5c9.2 0 17.5 2.3 24.8 6.2l7.2-14.3C72 23.1 61.5 20.5 50 20.5c-11.5 0-22 2.6-32 7.9l7.2 14.3c7.3-3.9 15.6-6.2 24.8-6.2zm42-13.6C79.7 15.3 65.3 11.5 50 11.5c-15.3 0-29.7 3.8-42 11.4l-2 4 9.9 1.3c9.5-5.1 20.5-8 32.1-8s22.6 2.9 32.1 8l9.9-1.3-2-4zM50 46.4c-2.6 0-4.9.4-7 1.2l2.2 39.1h9.6l2.2-39.1c-2.1-.8-4.4-1.2-7-1.2z" />
                </svg>
              )
            },
            {
              name: 'Porsche',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 18h56c0 34-9 68-28 76C31 86 22 52 22 18z" fill="rgba(16,185,129,0.05)" />
                  <path d="M30 24h40v8H30z" fill="currentColor" stroke="none" />
                  <path d="M30 36h18v22H30zm22 0h18v22H52z" strokeWidth="2" />
                  <path d="M42 42h16v18c-4 6-8 10-8 14 0-4-4-8-8-14V42z" fill="currentColor" stroke="none" />
                </svg>
              )
            },
            {
              name: 'BMW',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path fill="currentColor" d="M50 20A30 30 0 0 1 80 50H50V20zM50 50v30A30 30 0 0 1 20 50h30z" />
                </svg>
              )
            },
            {
              name: 'Mercedes-EQ',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path fill="currentColor" d="M50 12L46 47.5 17 64.5l30.5-6.5L50 88l2.5-30 30.5 6.5L54 47.5z" />
                </svg>
              )
            },
            {
              name: 'Audi',
              icon: (
                <svg viewBox="0 0 110 40" className="car-logo-svg" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <circle cx="23" cy="20" r="14" />
                  <circle cx="44" cy="20" r="14" />
                  <circle cx="66" cy="20" r="14" />
                  <circle cx="87" cy="20" r="14" />
                </svg>
              )
            },
            {
              name: 'Polestar',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M48 14l-3.5 35h35l-15.5-15.5 15.5-15.5H51.5l-3.5-4zm4 72l3.5-35h-35l15.5 15.5-15.5 15.5h28l3.5 4z" />
                </svg>
              )
            },
            {
              name: 'Hyundai',
              icon: (
                <svg viewBox="0 0 100 65" className="car-logo-svg">
                  <ellipse cx="50" cy="32.5" rx="44" ry="26" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path fill="currentColor" d="M33 16h6.5l-5.5 33H27.5zm27.5 0H67l-5.5 33H55zm-26 18c9-4.5 24-4.5 33 0l-1.5 5.5c-9-3.5-22-3.5-30 0z" />
                </svg>
              )
            },
            {
              name: 'Kia',
              icon: (
                <svg viewBox="0 0 100 45" className="car-logo-svg" fill="currentColor">
                  <path d="M10 10h7v10.5l13-10.5h8.5L25.5 24.5 40 37h-8.5L17 24.5V37h-7zm34 0h7v27h-7zm12 0h26.5l-8.5 27h-7.5l4.5-15.5h-7l-3.5 15.5h-7.5z" />
                </svg>
              )
            },
            {
              name: 'Rivian',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg" fill="currentColor">
                  <path d="M50 12l13 19-13 19-13-19zm0 38l13 19-13 19-13-19zm-24-19l13 19-13 19-13-19zm48 0l13 19-13 19-13-19z" />
                </svg>
              )
            },
            {
              name: 'Volvo',
              icon: (
                <svg viewBox="0 0 100 100" className="car-logo-svg">
                  <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="3.8" />
                  <path fill="currentColor" d="M72 18h15v15l-6.5-6.5-13 13-5.5-5.5 13-13z" />
                  <rect x="18" y="44" width="64" height="12" fill="currentColor" rx="2" />
                </svg>
              )
            },
            {
              name: 'Jaguar',
              icon: (
                <svg viewBox="0 0 110 50" className="car-logo-svg" fill="currentColor">
                  <path d="M8 32c12-8 24-16 40-16 12 0 24 6 36 3 8-2 15-8 20-13-2 8-8 14-16 17-14 4-28-1-42-1-14 0-26 5-38 10z" />
                  <path d="M72 23c6-2 12 1 18-2 4-2 7-6 9-10-1 6-5 10-11 12-6 2-11 0-16 0z" />
                </svg>
              )
            }
          ]).map((brand, idx) => (
            <div key={`${brand.name}-${idx}`} className="hp-brand-item">
              {brand.icon}
              <span className="hp-brand-name">{brand.name}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ═══════════════════════════════════════════════ */}
      {/*  WHITE AREA ZONE — Interactive Green Electro   */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="hp-white-zone" ref={whiteAreaRef}>
        <GreenElectroCanvas containerRef={whiteAreaRef} />

        {/* ── ANIMATED COUNTERS — Platform numbers ── */}
        <section className="hp-counters">
          <Reveal className="hp-counters-grid">
            <div className="hp-counter" ref={kw.ref}>
              <Zap size={28} className="hp-counter-icon" />
              <span className="hp-counter-value">{kw.count} kW</span>
              <span className="hp-counter-label">Max Rapid DC Output</span>
            </div>
          <div className="hp-counter" ref={sessions.ref}>
            <BatteryCharging size={28} className="hp-counter-icon" />
            <span className="hp-counter-value">{sessions.count.toLocaleString()}+</span>
            <span className="hp-counter-label">Charging Sessions Completed</span>
          </div>
          <div className="hp-counter" ref={rating.ref}>
            <Star size={28} className="hp-counter-icon" />
            <span className="hp-counter-value">{(rating.count / 10).toFixed(1)}/5.0</span>
            <span className="hp-counter-label">Average Customer Rating</span>
          </div>
          <div className="hp-counter" ref={cities.ref}>
            <Globe size={28} className="hp-counter-icon" />
            <span className="hp-counter-value">{cities.count}</span>
            <span className="hp-counter-label">London Boroughs Covered</span>
          </div>
        </Reveal>
      </section>


      {/* ═══════════════════════════════════════════════ */}
      {/*  HOW IT WORKS — 3-step staggered cards         */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="section-padded">
        <Reveal>
          <div className="section-header">
            <span className="section-eyebrow">How It Works</span>
            <h2 className="section-title">Charged in three simple steps.</h2>
            <p className="section-subtitle">From request to full battery in under 30 minutes — no cables, no apps to configure, no drama.</p>
          </div>
        </Reveal>
        <div className="steps-grid">
          {[
            { num: '01', icon: <MapPin size={28} />, title: 'Drop your pin', text: 'Open the app, select your vehicle from your garage, and drop a pin at your exact location — driveway, office car park, or roadside.' },
            { num: '02', icon: <Truck size={28} />, title: 'We come to you', text: 'A mobile charging unit carrying 200 kWh of stored energy is dispatched to your GPS coordinates. Track the technician live on the map.' },
            { num: '03', icon: <BatteryCharging size={28} />, title: 'Rapid DC charge', text: 'Our technician plugs in a CCS or NACS cable and delivers up to 150 kW of DC power. You get a digital VAT receipt the moment charging ends.' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 140} className="step-card">
              <div className="step-number">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-text">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>


      {/* ═══════════════════════════════════════════════ */}
      {/*  BENTO — Feature grid with mixed media         */}
        {/* ── BENTO — Feature grid with mixed media ── */}
        <section className="section-padded">
          <Reveal>
            <div className="section-header">
              <span className="section-eyebrow">Why Atlas Charge+</span>
              <h2 className="section-title">Built for the way London drives.</h2>
            </div>
          </Reveal>

          <div className="hp-bento">
            {/* Large feature card with image */}
            <Reveal className="hp-bento-card hp-bento-large">
              <img src="/hero-cable.jpg" alt="CCS rapid charging cable" className="hp-bento-img" data-electro-exclude="true" />
              <div className="hp-bento-overlay">
                <h3>Industrial-Grade DC Power</h3>
                <p>Liquid-cooled CCS Combo 2 cables rated for 1,000V / 350A continuous throughput with ISO 15118 Plug & Charge.</p>
              </div>
            </Reveal>

            {/* Small feature cards */}
            <Reveal delay={100} className="hp-bento-card hp-bento-sm">
              <div className="feature-icon"><Zap size={22} /></div>
              <h4 className="feature-title">Ultra-Rapid 150 kW</h4>
              <p className="feature-text">180 miles of range in 22 minutes. No throttling, no power sharing.</p>
            </Reveal>

            <Reveal delay={180} className="hp-bento-card hp-bento-sm">
              <div className="feature-icon"><Clock size={22} /></div>
              <h4 className="feature-title">9-Minute Response</h4>
              <p className="feature-text">Average technician arrival across Greater London. Faster than walking to a public charger.</p>
            </Reveal>

            <Reveal delay={260} className="hp-bento-card hp-bento-sm">
              <div className="feature-icon"><Shield size={22} /></div>
              <h4 className="feature-title">Live GPS Tracking</h4>
              <p className="feature-text">Watch your technician navigate to you in real-time with sub-second GPS breadcrumb updates.</p>
            </Reveal>

            <Reveal delay={340} className="hp-bento-card hp-bento-sm">
              <div className="feature-icon"><Star size={22} /></div>
              <h4 className="feature-title">Transparent Pricing</h4>
              <p className="feature-text">Flat £5 callout + £0.35/kWh. No hidden fees, no subscriptions.</p>
            </Reveal>

            {/* Wide feature card with night image */}
            <Reveal delay={100} className="hp-bento-card hp-bento-wide">
              <img src="/hero-night.jpg" alt="EV charging at night in London" className="hp-bento-img" data-electro-exclude="true" />
              <div className="hp-bento-overlay">
                <h3>Available 24 / 7</h3>
                <p>Emergency 3 AM boost on a cold January night? Our fleet never sleeps.</p>
              </div>
            </Reveal>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════ */}
        {/*  FLEET — Full-width cinematic image             */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="hp-fleet-section">
          <Reveal className="hp-fleet-img-wrap" data-electro-exclude="true">
            <img src="/hero-fleet.jpg" alt="Atlas Charge fleet depot at dusk" className="hp-fleet-img" data-electro-exclude="true" />
          </Reveal>
          <Reveal delay={120}>
            <div className="hp-fleet-caption">
              <h3>Our fleet. Your power grid.</h3>
              <p>Dozens of mobile rapid-charging trucks, each carrying 200 kWh of stored energy, staged across London and ready for immediate dispatch.</p>
            </div>
          </Reveal>
        </section>


        {/* ═══════════════════════════════════════════════ */}
        {/*  TESTIMONIALS — with photos and motion         */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="section-padded">
          <Reveal>
            <div className="section-header">
              <span className="section-eyebrow">Verified Reviews</span>
              <h2 className="section-title">Loved by EV drivers across London.</h2>
            </div>
          </Reveal>
          <div className="testimonials-grid">
            {(reviews && reviews.length > 0 ? reviews.slice(0, 3) : [
              { author_name: 'Sarah K.', vehicle_model: 'Tesla Model 3', comment: 'Marcus arrived in 8 minutes and gave my Model 3 a 35 kWh boost right on my driveway. I didn\'t even have to leave the house.', rating_stars: 5 },
              { author_name: 'James W.', vehicle_model: 'Porsche Taycan', comment: 'Stuck at 4% on the A40. Atlas dispatched a truck in under 12 minutes. The 150 kW speed was genuinely impressive.', rating_stars: 5 },
              { author_name: 'Priya M.', vehicle_model: 'BMW iX', comment: 'Transparent pricing sealed the deal — £5 callout and £0.35/kWh. I\'ve cancelled my public charging subscription entirely.', rating_stars: 5 },
            ]).map((t, i) => (
              <Reveal key={t.id || i} delay={i * 120} className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: t.rating_stars || 5 }).map((_, s) => <Star key={s} size={14} fill="var(--amber-primary)" color="var(--amber-primary)" />)}
                </div>
                <p className="testimonial-text">"{t.comment || t.text}"</p>
                <div className="testimonial-author">
                  <span className="testimonial-name">{t.author_name || t.name || 'Verified EV Driver'}</span>
                  <span className="testimonial-car">{t.vehicle_model || t.car || 'London EV'}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>


        {/* ═══════════════════════════════════════════════ */}
        {/*  TECHNICIAN — Human element                    */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="section-padded">
          <div className="hp-human-split">
            <Reveal className="hp-human-img-wrap" data-electro-exclude="true">
              <img src="/hero-tech.jpg" alt="Atlas Charge technician" className="hp-human-img" data-electro-exclude="true" />
            </Reveal>
            <Reveal delay={160} className="hp-human-content">
              <span className="section-eyebrow">Meet Your Technician</span>
              <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>
                Certified. Professional. Friendly.
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '24px' }}>
                Every Atlas technician is a fully certified high-voltage DC charging specialist with advanced CAN Bus diagnostics training. They arrive in a branded mobile unit, handle the entire process, and leave you with a clean VAT receipt.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['City & Guilds Level 3 EV Certified', 'Full DBS background checked', 'Average 4.9★ customer rating', 'ISO 15118 Plug & Charge trained'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--emerald-light)', color: 'var(--emerald-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={11} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════ */}
        {/*  FINAL CTA — Dark block                        */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="section-padded">
          <Reveal className="cta-block" data-electro-exclude="true">
            <img src="/logo.png" alt="Atlas Charge Plus+ Logo" className="cta-logo" data-electro-exclude="true" />
            <h2 className="cta-title">Your EV deserves better than a public charger queue.</h2>
            <p className="cta-subtitle">Request your first mobile rapid charge in under 60 seconds.</p>
            <div className="cta-actions">
              <button className="btn-hero-primary" onClick={() => navigate('/login')}>Get Started <ArrowRight size={18} /></button>
              <button className="btn-hero-secondary" onClick={() => navigate('/reviews')}>Read Reviews</button>
            </div>
          </Reveal>
        </section>
      </div>


      {/* ═══════════════════════════════════════════════ */}
      {/*  FOOTER                                        */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="site-footer" data-electro-exclude="true">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px' }} data-electro-exclude="true" />
            <span style={{ fontWeight: 800 }}>Atlas Charge Plus+</span>
          </div>
          <div className="footer-links">
            <a onClick={() => navigate('/tariffs')}>Tariffs</a>
            <a onClick={() => navigate('/connectors')}>Hardware</a>
            <a onClick={() => navigate('/reviews')}>Reviews</a>
            <a onClick={() => navigate('/login')}>Sign In</a>
          </div>
          <div className="footer-legal">© {new Date().getFullYear()} Atlas Charge Plus+ Ltd. London, UK.</div>
        </div>
      </footer>
    </div>
  );
}
