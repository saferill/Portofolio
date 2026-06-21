import { useState, useEffect, useRef } from 'react';
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
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Activate action pill buttons after 400ms page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setButtonsVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

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

  // Scroll reveal Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
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
          ? 'bg-white/80 backdrop-blur-md border-b border-black/5 shadow-sm'
          : 'bg-white/10 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none border-b border-transparent'
        }`}>
        {/* Logo */}
        <div className="flex flex-row items-center gap-3 cursor-pointer" onClick={() => scrollTo(heroRef)}>
          <span
            className="text-[21px] sm:text-[26px] tracking-tight text-black"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Syafril®
          </span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex flex-row items-center gap-8 text-[23px] text-black font-normal">
          <button onClick={() => scrollTo(aboutRef)} className="hover:opacity-60 transition-opacity cursor-pointer">About</button>
          <button onClick={() => scrollTo(projectsRef)} className="hover:opacity-60 transition-opacity cursor-pointer">Projects</button>
          <button onClick={() => scrollTo(contactRef)} className="hover:opacity-60 transition-opacity cursor-pointer">Contact</button>
        </div>

        {/* Desktop CTA */}
        <button
          onClick={() => scrollTo(contactRef)}
          className="hidden md:block text-[23px] text-black underline underline-offset-2 hover:opacity-60 transition-opacity cursor-pointer"
        >
          Get in touch
        </button>

        {/* Mobile Hamburger Toggle */}
        <button
          className="md:hidden flex flex-col items-center justify-center gap-[5px] z-30 relative cursor-pointer"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 transform ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''
              }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 transform ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
          />
        </button>
      </nav>

      {/* Mobile Overlay Menu */}
      <div
        className={`fixed inset-0 bg-white/95 backdrop-blur-sm z-25 md:hidden flex flex-col justify-center items-start px-8 gap-8 transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <button
          className="text-[32px] font-medium text-black hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(aboutRef)}
        >
          About
        </button>
        <button
          className="text-[32px] font-medium text-black hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(projectsRef)}
        >
          Projects
        </button>
        <button
          className="text-[32px] font-medium text-black hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
          onClick={() => scrollTo(contactRef)}
        >
          Contact
        </button>
        <button
          className="text-[32px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity text-left w-full cursor-pointer"
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
              className="pointer-events-none select-none mb-5 sm:mb-6 text-black"
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
              className="text-black mb-5 sm:mb-6"
              style={{
                fontSize: 'clamp(18px, 4vw, 26px)',
                lineHeight: '1.35',
                fontWeight: '400',
                minHeight: '54px',
              }}
            >
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px] cursor-blink" />
              )}
            </p>

            {/* Action Pill Buttons */}
            <div
              className={`flex flex-wrap gap-y-1 fade-slide-up ${buttonsVisible ? 'visible' : ''
                }`}
            >
              <button onClick={() => scrollTo(contactRef)} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer">
                Pitch us an idea
              </button>
              <button onClick={() => scrollTo(aboutRef)} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer">
                Come work here
              </button>
              <button onClick={() => scrollTo(contactRef)} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer">
                Send a brief hello
              </button>
              <button onClick={() => scrollTo(projectsRef)} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer">
                See how we operate
              </button>

            </div>
          </div>
        </section>

        {/* About Section */}
        <section
          ref={aboutRef}
          className="relative w-full min-h-screen flex items-center justify-center pt-40 pb-24 px-5 sm:px-8 md:px-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 150px, rgba(255, 255, 255, 1) 100%)'
          }}
        >
          <div className="max-w-4xl w-full flex flex-col gap-16 text-black">
            {/* Intro Narrative */}
            <div className="reveal-on-scroll max-w-3xl">
              <h2
                className="text-[32px] sm:text-[42px] tracking-tight mb-6 leading-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Tentang Syafril
              </h2>
              <p className="text-[20px] sm:text-[23px] leading-relaxed text-zinc-800 font-light">
                Halo, saya Syafril, seorang mahasiswa, desainer antarmuka (UI/UX), dan fullstack developer yang berfokus pada estetika visual. Saya suka memadukan seni desain dengan fungsionalitas teknologi untuk menciptakan pengalaman digital yang intuitif, bersih, dan berkesan. Bagi saya, keindahan terletak pada kesederhanaan dan ketelitian di setiap piksel.
              </p>
            </div>

            {/* Keahlian & Tools */}
            <div className="flex flex-col gap-8">
              <h3
                className="text-[18px] sm:text-[20px] tracking-wider uppercase text-zinc-400 font-bold reveal-on-scroll"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Keahlian &amp; Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="reveal-on-scroll bg-black/[0.02] border border-black/5 rounded-xl p-6 hover:bg-black/[0.04] transition-colors duration-300" style={{ transitionDelay: '50ms' }}>
                  <h4 className="font-bold text-[18px] mb-2">Visual &amp; UI/UX Design</h4>
                  <p className="text-zinc-600 text-[15px] leading-relaxed">Menciptakan tata letak dan grafik menarik menggunakan CorelDraw, Canva, dan Adobe Suite.</p>
                </div>
                <div className="reveal-on-scroll bg-black/[0.02] border border-black/5 rounded-xl p-6 hover:bg-black/[0.04] transition-colors duration-300" style={{ transitionDelay: '100ms' }}>
                  <h4 className="font-bold text-[18px] mb-2">Fullstack Development</h4>
                  <p className="text-zinc-600 text-[15px] leading-relaxed">Membangun antarmuka interaktif responsif berbasis HTML, CSS, JavaScript, React, dan integrasi backend.</p>
                </div>
                <div className="reveal-on-scroll bg-black/[0.02] border border-black/5 rounded-xl p-6 hover:bg-black/[0.04] transition-colors duration-300" style={{ transitionDelay: '150ms' }}>
                  <h4 className="font-bold text-[18px] mb-2">Video &amp; Motion Graphics</h4>
                  <p className="text-zinc-600 text-[15px] leading-relaxed">Mengedit rekaman dinamis dan efek visual menggunakan CapCut serta Adobe tools.</p>
                </div>
                <div className="reveal-on-scroll bg-black/[0.02] border border-black/5 rounded-xl p-6 hover:bg-black/[0.04] transition-colors duration-300" style={{ transitionDelay: '200ms' }}>
                  <h4 className="font-bold text-[18px] mb-2">Productivity &amp; Data</h4>
                  <p className="text-zinc-600 text-[15px] leading-relaxed">Mengelola data proyek dan dokumentasi laporan rapi dengan Microsoft Excel dan Word.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section
          ref={projectsRef}
          className="relative w-full min-h-screen bg-zinc-50 flex items-center justify-center pt-40 pb-24 px-5 sm:px-8 md:px-10"
        >
          {/* Smooth transition from White (About) to Zinc-50 (Projects) */}
          <div className="absolute top-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-b from-white to-zinc-50" />
          <div className="max-w-4xl w-full text-black">
            <h2
              className="text-[32px] sm:text-[42px] tracking-tight mb-12 leading-none reveal-on-scroll"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Selected Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Project 1: MailTempPro */}
              <div className="reveal-on-scroll bg-white border border-black/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 group" style={{ transitionDelay: '50ms' }}>
                {/* Preview image */}
                <div className="overflow-hidden bg-zinc-100 h-[180px]">
                  <img
                    src="/previews/mailtemppro_preview.png"
                    alt="MailTempPro preview"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Web Application</span>
                    <h3
                      className="text-[22px] sm:text-[26px] tracking-tight font-medium mb-3 group-hover:text-zinc-600 transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      01 / MailTempPro
                    </h3>
                    <p className="text-[15px] text-zinc-600 mb-6 leading-relaxed">
                      Layanan pembuat email sementara (temp-mail) premium dengan kotak masuk real-time, alamat kustom, dan antarmuka bersih yang mengutamakan privasi.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">React</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">TypeScript</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">API Integration</span>
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <a href="https://mailtemppro.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity inline-flex items-center gap-1 cursor-pointer">
                        Kunjungi Situs ↗
                      </a>
                      <a href="https://github.com/saferill/TempMail" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] text-zinc-500 hover:text-black underline underline-offset-4 hover:opacity-60 transition-all inline-flex items-center gap-1 cursor-pointer font-medium">
                        Lihat Code ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project 2: World News Reports */}
              <div className="reveal-on-scroll bg-white border border-black/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 group" style={{ transitionDelay: '100ms' }}>
                <div className="overflow-hidden bg-zinc-100 h-[180px]">
                  <img
                    src="/previews/worldnews_preview.png"
                    alt="World News Reports preview"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">News Aggregator</span>
                    <h3
                      className="text-[22px] sm:text-[26px] tracking-tight font-medium mb-3 group-hover:text-zinc-600 transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      02 / World News Reports
                    </h3>
                    <p className="text-[15px] text-zinc-600 mb-6 leading-relaxed">
                      Portal kurasi berita global real-time yang mengumpulkan informasi teraktual dari berbagai penjuru dunia dengan kategorisasi topik yang intuitif.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">HTML5</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">CSS3</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">JavaScript</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">NewsAPI</span>
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <a href="https://worldnewsreports.github.io/" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity inline-flex items-center gap-1 cursor-pointer">
                        Kunjungi Situs ↗
                      </a>
                      <a href="https://github.com/worldnewsreports/worldnewsreports.github.io" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] text-zinc-500 hover:text-black underline underline-offset-4 hover:opacity-60 transition-all inline-flex items-center gap-1 cursor-pointer font-medium">
                        Lihat Code ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project 3: SafeVideos */}
              <div className="reveal-on-scroll bg-white border border-black/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 group" style={{ transitionDelay: '150ms' }}>
                <div className="overflow-hidden bg-zinc-100 h-[180px]">
                  <img
                    src="/previews/safevideos_preview.png"
                    alt="SafeVideos preview"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Video Streaming</span>
                    <h3
                      className="text-[22px] sm:text-[26px] tracking-tight font-medium mb-3 group-hover:text-zinc-600 transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      03 / SafeVideos
                    </h3>
                    <p className="text-[15px] text-zinc-600 mb-6 leading-relaxed">
                      Platform kurasi pemutaran video aman bagi semua umur dengan penyaringan ketat konten, bebas iklan, dan ramah pengguna.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Next.js</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Tailwind CSS</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Video API</span>
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <a href="https://safevideos.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity inline-flex items-center gap-1 cursor-pointer">
                        Kunjungi Situs ↗
                      </a>
                      <a href="https://github.com/saferill/safevideo" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] text-zinc-500 hover:text-black underline underline-offset-4 hover:opacity-60 transition-all inline-flex items-center gap-1 cursor-pointer font-medium">
                        Lihat Code ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project 4: Sonara Music App */}
              <div className="reveal-on-scroll bg-white border border-black/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 group" style={{ transitionDelay: '200ms' }}>
                <div className="overflow-hidden bg-zinc-900 h-[180px]">
                  <img
                    src="/previews/sonaramusic_preview.png"
                    alt="Sonara Music preview"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-bold mb-3 block">Android Application</span>
                    <h3
                      className="text-[22px] sm:text-[26px] tracking-tight font-medium mb-3 group-hover:text-zinc-600 transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      04 / Sonara Music
                    </h3>
                    <p className="text-[15px] text-zinc-600 mb-6 leading-relaxed">
                      Aplikasi pemutar musik Android premium dengan antarmuka dinamis modern, daftar putar kustom, dan mesin pemutaran audio berkualitas tinggi.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Android SDK</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Kotlin</span>
                      <span className="bg-zinc-100 text-zinc-800 text-[12px] px-3 py-1 rounded-full font-medium">Jetpack Compose</span>
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <a href="https://github.com/saferill/Music-App/releases/download/v1.3.0/Sonara.Music.apk" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] font-semibold underline underline-offset-4 hover:opacity-60 transition-opacity inline-flex items-center gap-1 cursor-pointer">
                        Unduh APK ↓
                      </a>
                      <a href="https://github.com/saferill/Music-App" target="_blank" rel="noopener noreferrer" className="text-[14px] sm:text-[15px] text-zinc-500 hover:text-black underline underline-offset-4 hover:opacity-60 transition-all inline-flex items-center gap-1 cursor-pointer font-medium">
                        Lihat Code ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          ref={contactRef}
          className="relative w-full min-h-screen bg-white flex items-center justify-center pt-40 pb-24 px-5 sm:px-8 md:px-10"
        >
          {/* Smooth transition from Zinc-50 (Projects) to White (Contact) */}
          <div className="absolute top-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-b from-zinc-50 to-white" />
          <div className="max-w-xl w-full text-black flex flex-col items-center text-center">
            <div className="reveal-on-scroll">
              <h2
                className="text-[32px] sm:text-[42px] tracking-tight mb-4 leading-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Let's Build Together
              </h2>
              <p className="text-[16px] sm:text-[18px] text-zinc-600 mb-8 max-w-md">
                Have an idea or a project in mind? Reach out and let's craft something exceptional.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6 text-left mb-12 reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
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
                  className="w-full bg-black/[0.02] border border-black/10 rounded-lg px-4 py-3 text-[16px] text-black focus:outline-none focus:border-black transition-colors"
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
                  className="w-full bg-black/[0.02] border border-black/10 rounded-lg px-4 py-3 text-[16px] text-black focus:outline-none focus:border-black transition-colors"
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
                  className="w-full bg-black/[0.02] border border-black/10 rounded-lg px-4 py-3 text-[16px] text-black h-32 focus:outline-none focus:border-black transition-colors resize-none"
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
                className="inline-flex items-center justify-center bg-black text-white rounded-full px-8 py-3 text-[15px] font-medium hover:bg-zinc-800 transition-colors cursor-pointer self-center"
              >
                {formStatus === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
            </form>


          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-8 border-t border-black/5 bg-white flex flex-col sm:flex-row items-center justify-between px-5 sm:px-8 md:px-10 text-[14px] text-zinc-500">
          <p>© {new Date().getFullYear()} Moch. Syafril Ramadhani.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="https://github.com/saferill" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">GitHub</a>
            <a href="#" className="hover:text-black transition-colors">Instagram</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
