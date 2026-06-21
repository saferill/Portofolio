import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ContainerScroll } from "./components/ui/container-scroll-animation";

// Icons for Dark Mode
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
import emailjs from '@emailjs/browser';

function useTypewriter(text: string, speed: number = 38, startDelay: number = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let index = 0;
    let timerId: any = null;

    const startTyping = () => {
      timerId = setInterval(() => {
        if (index < text.length) {
          setDisplayed(text.substring(0, index + 1));
          index++;
        } else {
          setDone(true);
          clearInterval(timerId);
        }
      }, speed);
    };

    const delayId = setTimeout(startTyping, startDelay);

    return () => {
      clearTimeout(delayId);
      if (timerId) clearInterval(timerId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Intro screen — 'visible' | 'hiding' | 'hidden'
  const alreadySeen = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('intro_seen');
  const [introPhase, setIntroPhase] = useState<'visible' | 'hiding' | 'hidden'>(alreadySeen ? 'hidden' : 'visible');

  useEffect(() => {
    if (alreadySeen) return;
    // Hold for 1.8s then start fade-out
    const holdTimer = setTimeout(() => {
      setIntroPhase('hiding');
    }, 1800);
    // After fade-out animation (0.7s) fully remove overlay
    const removeTimer = setTimeout(() => {
      setIntroPhase('hidden');
      sessionStorage.setItem('intro_seen', '1');
    }, 2500);
    return () => { clearTimeout(holdTimer); clearTimeout(removeTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track window scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Form states
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Video scrubbing refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevXRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const SENSITIVITY = 0.8;

  // Section refs for smooth scrolling
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Typewriter effect
  const introText = "Senang Anda berkunjung. Desain yang baik selalu menemukan jalannya. Jadi, apa yang akan kita rancang?";
  const { displayed, done } = useTypewriter(introText, 38, 600);

  // Set initial target time once metadata is loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      targetTimeRef.current = videoRef.current.currentTime;
    }
  };

  // Queue next seek or release lock on seeked event
  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;

    const diff = Math.abs(video.currentTime - targetTimeRef.current);
    if (diff > 0.05) {
      video.currentTime = targetTimeRef.current;
    } else {
      isSeekingRef.current = false;
    }
  };

  // Handle window mousemove scrubbing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video) return;

      const currentX = e.clientX;
      if (prevXRef.current === null) {
        prevXRef.current = currentX;
        return;
      }

      const delta = currentX - prevXRef.current;
      prevXRef.current = currentX;

      const duration = video.duration || 0;
      if (duration === 0 || isNaN(duration)) return;

      const timeOffset = (delta / window.innerWidth) * SENSITIVITY * duration;
      let nextTargetTime = targetTimeRef.current + timeOffset;

      // Clamp between 0 and video duration
      nextTargetTime = Math.max(0, Math.min(duration, nextTargetTime));
      targetTimeRef.current = nextTargetTime;

      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = nextTargetTime;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);



  // Scroll to section helper
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formState.name || !formState.email || !formState.message) {
      setFormStatus('error');
      setErrorMessage('Please fill in all fields before sending.');
      return;
    }
    setFormStatus('loading');

    const serviceId = 'service_vk2uhn9';
    const publicKey = 'gcwzQSlYyYEriwK_9';

    const unifiedParams = {
      // Name
      name: formState.name,
      from_name: formState.name,
      to_name: formState.name,
      user_name: formState.name,

      // Email — termasuk typo "replay_to" yang ada di dashboard
      email: formState.email,
      from_email: formState.email,
      to_email: formState.email,
      reply_to: formState.email,
      replay_to: formState.email,   // typo di template EmailJS dashboard
      user_email: formState.email,

      // Pesan
      message: formState.message,
      project_brief: formState.message,
      brief: formState.message,

      // Variabel tambahan yang dipakai di template
      title: 'Pesan Baru dari Website',
      page_title: 'Portfolio Syafril',
      timestamp: new Date().toLocaleString('id-ID'),
    };

    // Step 1: Kirim notifikasi ke pemilik (wajib berhasil)
    emailjs.send(serviceId, 'template_x6ik4ir', unifiedParams, publicKey)
      .then(() => {
        // Step 2: Kirim auto-reply ke pengirim (opsional, tidak memblok sukses)
        emailjs.send(serviceId, 'template_eku1gjx', unifiedParams, publicKey)
          .catch((err) => {
            // Auto-reply gagal tapi notifikasi sudah terkirim — log saja
            console.warn('Auto-reply failed (non-critical):', err);
          });

        // Tandai sukses segera setelah notifikasi berhasil
        setFormStatus('success');
        setFormState({ name: '', email: '', message: '' });
      })
      .catch((error) => {
        console.error('Notification EmailJS Error:', error);
        setFormStatus('error');

        let errorDetails = '';
        if (error && typeof error === 'object') {
          errorDetails = error.text || error.message || JSON.stringify(error);
        } else {
          errorDetails = String(error);
        }
        setErrorMessage(`Gagal mengirim pesan. ${errorDetails}`);
      });
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden select-none">
      {/* Intro screen overlay */}
      {introPhase !== 'hidden' && (
        <div className={`intro-overlay ${introPhase === 'hiding' ? 'hiding' : ''}`}>
          <span className="intro-text">Syafril</span>
        </div>
      )}
      {/* Background Video */}
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4"
        className="fixed inset-0 z-0 object-cover w-full h-full"
        style={{ objectPosition: '70% center' }}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
      />

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 w-full px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center z-20 transition-all duration-300 ${scrolled
          ? 'bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 shadow-sm'
          : 'bg-white/10 dark:bg-black/10 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none border-b border-transparent'
        }`}>
        {/* Logo */}
        <div className="flex flex-row items-center gap-3 cursor-pointer" onClick={() => scrollTo(heroRef)}>
          <span
            className="text-[21px] sm:text-[26px] tracking-tight text-black dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Syafril®
          </span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex flex-row items-center gap-8 text-[23px] text-black dark:text-white font-normal">
          <button onClick={() => scrollTo(aboutRef)} className="hover:opacity-60 transition-opacity cursor-pointer">About</button>
          <button onClick={() => scrollTo(projectsRef)} className="hover:opacity-60 transition-opacity cursor-pointer">Projects</button>
          <button onClick={() => scrollTo(contactRef)} className="hover:opacity-60 transition-opacity cursor-pointer">Contact</button>
        </div>

        {/* Theme Toggle & Desktop CTA */}
        <div className="hidden md:flex flex-row items-center gap-6">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-black dark:text-white hover:opacity-60 transition-opacity cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-black/5 dark:bg-white/10">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => scrollTo(contactRef)}
            className="text-[23px] text-black dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity cursor-pointer"
          >
            Get in touch
          </button>
        </div>

        {/* Mobile Nav Actions */}
        <div className="md:hidden flex flex-row items-center gap-4 z-30 relative">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-black dark:text-white hover:opacity-60 transition-opacity cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-black/5 dark:bg-white/10">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          {/* Mobile Hamburger Toggle */}
          <button
            className="flex flex-col items-center justify-center gap-[5px] cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            <span
              className={`w-6 h-[2px] bg-black dark:bg-white transition-all duration-300 transform ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                }`}
            />
            <span
              className={`w-6 h-[2px] bg-black dark:bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''
                }`}
            />
            <span
              className={`w-6 h-[2px] bg-black dark:bg-white transition-all duration-300 transform ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile Overlay Menu */}
      <div
        className={`fixed inset-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm z-25 md:hidden flex flex-col justify-center items-start px-8 gap-8 transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <button
          className="text-[32px] font-medium text-black dark:text-white hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(aboutRef)}
        >
          About
        </button>
        <button
          className="text-[32px] font-medium text-black dark:text-white hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(projectsRef)}
        >
          Projects
        </button>
        <button
          className="text-[32px] font-medium text-black dark:text-white hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(contactRef)}
        >
          Contact
        </button>
        <button
          className="text-[32px] font-medium text-black dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(contactRef)}
        >
          Get in touch
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="relative z-10 w-full flex flex-col">
        {/* Hero Section */}
        <section ref={heroRef} className="relative h-screen flex flex-col justify-end pb-12 md:justify-center md:pb-0 px-5 sm:px-8 md:px-10 overflow-hidden">
          <div className="max-w-xl relative z-10">
            {/* Blurred Intro Label */}
            <div
              className="pointer-events-none select-none mb-5 sm:mb-6 text-black dark:text-white"
              style={{
                fontSize: 'clamp(18px, 4vw, 26px)',
                lineHeight: '1.3',
                fontWeight: '400',
                filter: 'blur(4px)',
              }}
            >
              Halo, saya Syafril,<br />
              Desainer UI/UX &amp; Fullstack Developer
            </div>

            {/* Typewriter Text */}
            <p
              className="text-black dark:text-white mb-5 sm:mb-6"
              style={{
                fontSize: 'clamp(18px, 4vw, 26px)',
                lineHeight: '1.35',
                fontWeight: '400',
                minHeight: '54px',
              }}
            >
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[1.1em] bg-black dark:bg-white align-middle ml-[2px] cursor-blink" />
              )}
            </p>

            {/* Action Pill Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-wrap gap-y-1"
            >
              <button onClick={() => scrollTo(contactRef)} className="inline-flex items-center justify-center bg-white dark:bg-[#111] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200 cursor-pointer">
                Pitch us an idea
              </button>
              <button onClick={() => scrollTo(aboutRef)} className="inline-flex items-center justify-center bg-white dark:bg-[#111] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200 cursor-pointer">
                Come work here
              </button>
              <button onClick={() => scrollTo(contactRef)} className="inline-flex items-center justify-center bg-white dark:bg-[#111] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200 cursor-pointer">
                Send a brief hello
              </button>
              <button onClick={() => scrollTo(projectsRef)} className="inline-flex items-center justify-center bg-white dark:bg-[#111] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200 cursor-pointer">
                See how we operate
              </button>

            </motion.div>
          </div>
        </section>

        {/* About Section */}
        <section
          ref={aboutRef}
          className="relative w-full min-h-screen flex items-center justify-center pt-40 pb-24 px-5 sm:px-8 md:px-10"
          style={{
            background: isDarkMode
              ? 'linear-gradient(to bottom, rgba(10, 10, 10, 0) 0%, rgba(10, 10, 10, 1) 150px, rgba(10, 10, 10, 1) 100%)'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 150px, rgba(255, 255, 255, 1) 100%)'
          }}
        >
          <div className="max-w-4xl w-full flex flex-col gap-16 text-black dark:text-white relative z-10">
            {/* Intro Narrative */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="max-w-3xl">
              <h2
                className="text-[32px] sm:text-[42px] tracking-tight mb-6 leading-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Tentang Syafril
              </h2>
              <p className="text-[20px] sm:text-[23px] leading-relaxed text-zinc-800 dark:text-zinc-300 font-light">
                Halo, saya Syafril, seorang mahasiswa, desainer antarmuka (UI/UX), dan fullstack developer yang berfokus pada estetika visual. Saya suka memadukan seni desain dengan fungsionalitas teknologi untuk menciptakan pengalaman digital yang intuitif, bersih, dan berkesan. Bagi saya, keindahan terletak pada kesederhanaan dan ketelitian di setiap piksel.
              </p>
            </motion.div>

            {/* Keahlian & Tools */}
            <div className="flex flex-col gap-8">
              <motion.h3
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
                className="text-[18px] sm:text-[20px] tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-bold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Keahlian &amp; Tools
              </motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl p-6 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <h4 className="font-bold text-[18px] mb-2">Visual &amp; UI/UX Design</h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed">Menciptakan tata letak dan grafik menarik menggunakan CorelDraw, Canva, dan Adobe Suite.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl p-6 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <h4 className="font-bold text-[18px] mb-2">Fullstack Development</h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed">Membangun antarmuka interaktif responsif berbasis HTML, CSS, JavaScript, React, dan integrasi backend.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl p-6 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <h4 className="font-bold text-[18px] mb-2">Video &amp; Motion Graphics</h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed">Mengedit rekaman dinamis dan efek visual menggunakan CapCut serta Adobe tools.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl p-6 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <h4 className="font-bold text-[18px] mb-2">Productivity &amp; Data</h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed">Mengelola data proyek dan dokumentasi laporan rapi dengan Microsoft Excel dan Word.</p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section
          ref={projectsRef}
          className="relative w-full bg-zinc-50 dark:bg-[#111] flex flex-col items-center pt-40 pb-24 px-5 sm:px-8 md:px-10 overflow-hidden"
        >
          {/* Smooth transition from White (About) to Zinc-50 (Projects) */}
          <div className="absolute top-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-b from-transparent to-zinc-50 dark:to-[#111] z-10" />
          
          <div className="w-full text-center mb-10 z-20 relative">
            <motion.h2
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}
              className="text-[32px] sm:text-[42px] md:text-[5rem] tracking-tight leading-none text-black dark:text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Selected Work
            </motion.h2>
          </div>

          <div className="flex flex-col w-full gap-0 -mt-10 md:-mt-20 z-20 relative">

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Movie Platform</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    01 / CineWatch
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Platform modern untuk eksplorasi film, seri, anime, dan donghua. Menampilkan trending movies, fitur pencarian canggih, serta manajemen daftar tontonan.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">React</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">API Integration</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://cinewatch.web.id/" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Kunjungi Situs ↗</a>
                    <a href="https://github.com/saferill/CineWatch" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/cinewatch_preview.png" alt="01 / CineWatch" className="w-full h-full object-contain object-center" />
            </ContainerScroll>

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Music Streaming</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    02 / Coda Music
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Aplikasi pemutar musik berbasis web dengan antarmuka elegan. Menawarkan fitur pemutaran audio lancar, eksplorasi playlist, dan koleksi musik terkini.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Next.js</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">API Integration</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://codamusic.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Kunjungi Situs ↗</a>
                    <a href="https://github.com/saferill/coda" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/codamusic_preview.png" alt="02 / Coda Music" className="w-full h-full object-contain object-center" />
            </ContainerScroll>

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Web Application</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    03 / MailTempPro
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Layanan pembuat email sementara (temp-mail) premium dengan kotak masuk real-time, alamat kustom, dan antarmuka bersih yang mengutamakan privasi.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">React</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">TypeScript</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">API Integration</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://mailtemppro.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Kunjungi Situs ↗</a>
                    <a href="https://github.com/saferill/TempMail" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/mailtemppro_preview.png" alt="03 / MailTempPro" className="w-full h-full object-contain object-center" />
            </ContainerScroll>

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">News Aggregator</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    04 / World News Reports
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Portal kurasi berita global real-time yang mengumpulkan informasi teraktual dari berbagai penjuru dunia dengan kategorisasi topik yang intuitif.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">HTML5</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">CSS3</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">JavaScript</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">NewsAPI</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://worldnewsreports.github.io/" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Kunjungi Situs ↗</a>
                    <a href="https://github.com/worldnewsreports/worldnewsreports.github.io" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/worldnews_preview.png" alt="04 / World News Reports" className="w-full h-full object-contain object-center" />
            </ContainerScroll>

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Video Streaming</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    05 / SafeVideos
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Platform kurasi pemutaran video aman bagi semua umur dengan penyaringan ketat konten, bebas iklan, dan ramah pengguna.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Next.js</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Video API</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://safevideos.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Kunjungi Situs ↗</a>
                    <a href="https://github.com/saferill/safevideo" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/safevideos_preview.png" alt="05 / SafeVideos" className="w-full h-full object-contain object-center" />
            </ContainerScroll>

            <ContainerScroll
              titleComponent={
                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Android Application</span>
                  <h3 className="text-[32px] sm:text-[42px] tracking-tight font-medium mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    06 / Sonara Music
                  </h3>
                  <p className="text-[16px] text-zinc-600 dark:text-zinc-400 max-w-2xl mb-6 leading-relaxed">
                    Aplikasi pemutar musik Android premium dengan antarmuka dinamis modern, daftar putar kustom, dan mesin pemutaran audio berkualitas tinggi.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Android SDK</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Kotlin</span><span className="bg-zinc-200 dark:bg-[#222] text-zinc-800 dark:text-zinc-300 text-[12px] px-3 py-1 rounded-full font-medium">Jetpack Compose</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-6">
                    <a href="https://github.com/saferill/Music-App/releases/download/v1.3.0/Sonara.Music.apk" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity text-black dark:text-white">Unduh APK ↓</a>
                    <a href="https://github.com/saferill/Music-App" target="_blank" rel="noopener noreferrer" className="text-[15px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white underline underline-offset-4 hover:opacity-60 transition-all font-medium">Lihat Code ↗</a>
                  </div>
                </div>
              }
            >
              <img src="/previews/sonaramusic_preview.png" alt="06 / Sonara Music" className="w-full h-full object-cover object-top" />
            </ContainerScroll>
          </div>
        </section>

        {/* Contact Section */}
        <section
          ref={contactRef}
          className="relative w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center pt-40 pb-24 px-5 sm:px-8 md:px-10"
        >
          {/* Smooth transition from Zinc-50 (Projects) to White (Contact) */}
          <div className="absolute top-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-b from-zinc-50 to-white dark:from-[#111] dark:to-[#0a0a0a]" />
          <div className="max-w-xl w-full text-black dark:text-white flex flex-col items-center text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="flex flex-col items-center">
              <h2
                className="text-[32px] sm:text-[42px] tracking-tight mb-4 leading-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Let's Build Together
              </h2>
              <p className="text-[16px] sm:text-[18px] text-zinc-600 dark:text-zinc-400 mb-8 max-w-md">
                Have an idea or a project in mind? Reach out and let's craft something exceptional.
              </p>
            </motion.div>

            <motion.form initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.2 }} onSubmit={handleSubmit} className="w-full flex flex-col gap-6 text-left mb-12">
              <div>
                <label className="text-[12px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-[16px] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-[16px] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">
                  Project Brief
                </label>
                <textarea
                  required
                  placeholder="Describe your idea or goals..."
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-[16px] text-black dark:text-white h-32 focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
                />
              </div>

              {formStatus === 'success' && (
                <div className="text-emerald-600 font-medium text-center py-2">
                  Thank you! Your message has been sent successfully.
                </div>
              )}

              {formStatus === 'error' && (
                <div className="text-red-500 font-medium text-center py-2 text-[14px]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={formStatus === 'loading'}
                className="inline-flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full px-8 py-3 text-[15px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer self-center"
              >
                {formStatus === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
            </motion.form>


          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0a] flex flex-col sm:flex-row items-center justify-between px-5 sm:px-8 md:px-10 text-[14px] text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Moch. Syafril Ramadhani.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="https://github.com/saferill" target="_blank" rel="noopener noreferrer" className="hover:text-black dark:hover:text-white transition-colors">GitHub</a>
            <a href="https://www.instagram.com/safe_rill/" target="_blank" rel="noopener noreferrer" className="hover:text-black dark:hover:text-white transition-colors">Instagram</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
