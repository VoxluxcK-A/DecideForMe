import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleHelp, Clock3, Menu, Shuffle, Sparkles, X } from 'lucide-react';
import characterVideo from './assets/mainframe-character.mp4';
import characterPoster from './assets/decision-background.jpg';
import './decide.css';

const lunchOptions = ['Sushi', 'Pizza', 'Burger'];

function useRevealSections() {
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a className={`dfm-brand${light ? ' dfm-brand-light' : ''}`} href="/home" aria-label="Decide For Me home">
      Decide For Me<span>.</span>
      <i aria-hidden="true">✳</i>
    </a>
  );
}

function DecisionCard() {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const decide = () => {
    if (thinking) return;
    setThinking(true);
    setResult(null);
    timer.current = setTimeout(() => {
      const candidates = result && lunchOptions.length > 1
        ? lunchOptions.filter((option) => option !== result)
        : lunchOptions;
      const winner = candidates[Math.floor(Math.random() * candidates.length)];
      setResult(winner);
      setThinking(false);
    }, 850);
  };

  return (
    <div className="dfm-decision-card" aria-label="Interactive lunch decision demo">
      <div className="dfm-card-topline">
        <span className="dfm-card-eyebrow">LET’S MAKE A CHOICE</span>
        <span className="dfm-ready"><i /> Ready to decide</span>
      </div>
      <div className="dfm-card-heading">
        <span className="dfm-card-icon"><CircleHelp size={20} strokeWidth={1.7} /></span>
        <div>
          <h2>What should I have for lunch?</h2>
          <p>Can’t decide? We’ve got you.</p>
        </div>
      </div>
      <div className="dfm-choice-list" role="group" aria-label="Choose a lunch option">
        {lunchOptions.map((option, index) => (
          <button
            type="button"
            className={`dfm-choice${selected === option ? ' is-selected' : ''}`}
            aria-pressed={selected === option}
            key={option}
            onClick={() => setSelected(option)}
          >
            <span className={`dfm-choice-number dfm-choice-number-${index + 1}`}>0{index + 1}</span>
            <span>{option}</span>
            {selected === option && <Check size={17} aria-label="Selected" />}
          </button>
        ))}
      </div>
      {thinking ? (
        <div className="dfm-thinking" role="status"><span /><span /><span /> Finding your answer…</div>
      ) : result ? (
        <div className="dfm-result" aria-live="polite">
          <span className="dfm-result-icon"><Sparkles size={17} /></span>
          <div><small>YOUR LUNCH IS</small><strong>{result}</strong></div>
          <button type="button" className="dfm-again" onClick={decide}>Try again <Shuffle size={14} /></button>
        </div>
      ) : (
        <button type="button" className="dfm-card-submit" onClick={decide}>
          Decide for me <ArrowRight size={17} />
        </button>
      )}
      <p className="dfm-card-footnote">Decision made. No more overthinking.</p>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 24);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`dfm-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="dfm-nav-inner">
        <Brand />
        <nav className="dfm-desktop-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>
        <a className="dfm-nav-cta" href="/decide">Try it now <ArrowUpRight size={16} /></a>
        <button
          type="button"
          className="dfm-menu-toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="dfm-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      <div
        id="dfm-mobile-menu"
        className={`dfm-mobile-menu${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <nav aria-label="Mobile navigation">
          <a href="#how-it-works" onClick={closeMenu}>How it works <ArrowUpRight /></a>
          <a href="#features" onClick={closeMenu}>Features <ArrowUpRight /></a>
          <a href="#about" onClick={closeMenu}>About <ArrowUpRight /></a>
          <a className="dfm-mobile-cta" href="/decide" onClick={closeMenu}>Try it now <ArrowUpRight /></a>
        </nav>
        <span className="dfm-mobile-note">A little less thinking. A little more doing.</span>
      </div>
    </header>
  );
}

function HeroSection() {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousX = useRef<number | null>(null);
  const targetTime = useRef(0);
  const pendingMovement = useRef(0);
  const isSeeking = useRef(false);

  useEffect(() => {
    const hero = heroRef.current;
    const video = videoRef.current;
    if (!hero || !video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const loadVideo = () => {
      if (video.getAttribute('src')) return;
      video.src = characterVideo;
      video.load();
    };

    const seekBy = (deltaX: number) => {
      if (!video.duration || !Number.isFinite(video.duration)) {
        pendingMovement.current += deltaX;
        return;
      }

      const movement = pendingMovement.current + deltaX;
      pendingMovement.current = 0;
      const timeOffset = (movement / Math.max(hero.clientWidth, 1)) * 0.8 * video.duration;
      targetTime.current = Math.max(0, Math.min(video.duration, targetTime.current + timeOffset));

      if (!isSeeking.current) {
        isSeeking.current = true;
        video.currentTime = targetTime.current;
      }
    };

    const handlePointerEnter = (event: PointerEvent) => {
      previousX.current = event.clientX;
      loadVideo();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (previousX.current === null) {
        previousX.current = event.clientX;
        return;
      }
      const deltaX = event.clientX - previousX.current;
      previousX.current = event.clientX;
      seekBy(deltaX);
    };
    const handlePointerLeave = () => {
      previousX.current = null;
    };
    const handleLoadedMetadata = () => {
      targetTime.current = video.currentTime || 0;
      if (pendingMovement.current) seekBy(0);
    };
    const handleSeeked = () => {
      if (Math.abs(video.currentTime - targetTime.current) > 0.02) {
        video.currentTime = targetTime.current;
      } else {
        isSeeking.current = false;
      }
    };

    hero.addEventListener('pointerenter', handlePointerEnter, { passive: true });
    hero.addEventListener('pointermove', handlePointerMove, { passive: true });
    hero.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    return () => {
      hero.removeEventListener('pointerenter', handlePointerEnter);
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', handlePointerLeave);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  return (
    <section className="dfm-hero" id="home" ref={heroRef}>
      <video
        ref={videoRef}
        className="dfm-hero-background"
        poster={characterPoster}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="dfm-hero-grid">
        <div className="dfm-hero-copy">
          <div className="dfm-kicker dfm-hero-kicker"><i /> YOUR PERSONAL DECISION ASSISTANT</div>
          <h1>Too many<br />choices.<br /><span className="dfm-highlight">Let us decide.</span></h1>
          <p className="dfm-hero-description">
            Life is full of little decisions. From what to eat to what to do next, let Decide For Me take the guesswork out of choosing.
          </p>
          <div className="dfm-hero-actions">
            <a className="dfm-button dfm-button-dark" href="/decide">Make a decision <ArrowUpRight size={17} /></a>
            <a className="dfm-text-link" href="#how-it-works">See how it works <ArrowDown size={15} /></a>
          </div>
          <div className="dfm-social-proof">
            <span className="dfm-proof-mark"><Check size={13} /></span>
            <span>For the little choices that take up too much space.</span>
          </div>
        </div>
        <div className="dfm-hero-visual">
          <div className="dfm-orbit dfm-orbit-one" />
          <div className="dfm-orbit dfm-orbit-two" />
          <div className="dfm-orbit-dot" />
          <div className="dfm-card-float"><DecisionCard /></div>
          <span className="dfm-visual-caption"><span>01</span> A decision, made lighter.</span>
        </div>
      </div>
      <div className="dfm-hero-bottom"><span>LESS FRICTION, MORE FORWARD</span><span>SCROLL TO EXPLORE <ArrowDown size={13} /></span></div>
    </section>
  );
}

const steps = [
  {
    number: '01',
    title: 'Tell us',
    copy: 'Describe what you need help deciding. Something simple or something a little more complicated.',
    visual: <div className="dfm-step-input"><span>What should I do this weekend?</span><ArrowUpRight size={15} /></div>,
  },
  {
    number: '02',
    title: 'Add your options',
    copy: 'Give us your choices, or let us help you explore the possibilities.',
    visual: <div className="dfm-step-options"><span>Stay in <Check size={13} /></span><span>Go out</span><span>Surprise me</span></div>,
  },
  {
    number: '03',
    title: 'Get your answer',
    copy: 'Let Decide For Me pick an option, so you can move forward without overthinking.',
    visual: <div className="dfm-step-result"><span><Sparkles size={15} /> THE PICK</span><strong>Go out</strong></div>,
  },
];

function HowItWorks() {
  return (
    <section className="dfm-how dfm-section" id="how-it-works">
      <div className="dfm-section-heading" data-reveal>
        <div className="dfm-kicker"><i /> SIMPLE BY DESIGN</div>
        <h2>Three steps.<br />One less thing to worry about.</h2>
      </div>
      <div className="dfm-steps">
        {steps.map((step) => (
          <article className="dfm-step" key={step.number} data-reveal>
            <div className="dfm-step-visual">{step.visual}</div>
            <div className="dfm-step-meta"><span>{step.number}</span><span>—</span><span>{step.title}</span></div>
            <p>{step.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const features = [
  { icon: <Clock3 />, title: 'Quick decisions', copy: 'Make everyday decisions in seconds, without comparing endless options.' },
  { icon: <Shuffle />, title: 'A fair pick', copy: 'When you truly don’t have a preference, leave it to chance.' },
  { icon: <Sparkles />, title: 'Made for you', copy: 'Keep your choices focused on what matters to you.' },
  { icon: <CircleHelp />, title: 'Simple by nature', copy: 'No setup, no noise, no unnecessary steps. Just decisions.' },
];

function FeaturesSection() {
  return (
    <section className="dfm-features dfm-section" id="features">
      <div className="dfm-feature-heading" data-reveal>
        <div><div className="dfm-kicker"><i /> LESS THINKING, MORE DOING</div><h2>A little less thinking.<br />A little more doing.</h2></div>
        <p>Small decisions shouldn’t take up so much room in your day. Give them a nudge and move on.</p>
      </div>
      <div className="dfm-feature-grid">
        {features.map((feature, index) => (
          <article className="dfm-feature-card" key={feature.title} data-reveal>
            <div className="dfm-feature-top"><span className="dfm-feature-icon">{feature.icon}</span><span>0{index + 1}</span></div>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
            <span className="dfm-feature-line" />
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="dfm-final" id="contact">
      <div className="dfm-final-orb dfm-final-orb-one" />
      <div className="dfm-final-orb dfm-final-orb-two" />
      <div className="dfm-final-content" data-reveal>
        <div className="dfm-kicker dfm-kicker-light"><i /> YOUR NEXT MOVE</div>
        <h2>Your next decision<br />starts here.</h2>
        <p>Stop overthinking the little things. Make a choice and move forward.</p>
        <a href="/decide" className="dfm-button dfm-button-lime">Make a decision <ArrowUpRight size={17} /></a>
      </div>
      <span className="dfm-final-index">LESS FRICTION. BETTER DECISIONS.</span>
    </section>
  );
}

function Footer() {
  return (
    <footer className="dfm-footer" id="about">
      <div className="dfm-footer-top">
        <div><Brand /><p>Made to make choosing easier.</p></div>
        <nav aria-label="Footer navigation">
          <a href="#home">Home</a><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#contact">Contact</a>
        </nav>
        <a className="dfm-footer-up" href="#home" aria-label="Back to top"><ArrowUpRight size={20} /></a>
      </div>
      <div className="dfm-footer-bottom"><span>© {new Date().getFullYear()} Decide For Me</span><span>FORWARD IS A GOOD DIRECTION.</span></div>
    </footer>
  );
}

export default function DecideForMe() {
  useRevealSections();

  useEffect(() => {
    document.title = 'Decide For Me — A little less overthinking';
  }, []);

  return (
    <div className="dfm-site">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <FeaturesSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
