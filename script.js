const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-header nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

const floatingNav = document.querySelector('.floating-nav');
if (floatingNav) {
  const floatingNavToggle = floatingNav.querySelector('.floating-nav-toggle');
  const floatingNavMenu = floatingNav.querySelector('.floating-nav-menu');
  const floatingNavClose = floatingNav.querySelector('.floating-nav-close');
  const setFloatingNavOpen = open => {
    floatingNavMenu.hidden = !open;
    floatingNavToggle.setAttribute('aria-expanded', String(open));
  };
  floatingNavToggle.addEventListener('click', () => setFloatingNavOpen(floatingNavToggle.getAttribute('aria-expanded') !== 'true'));
  floatingNavClose.addEventListener('click', () => { setFloatingNavOpen(false); floatingNavToggle.focus(); });
  floatingNavMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setFloatingNavOpen(false)));
  document.addEventListener('click', event => { if (!floatingNav.contains(event.target)) setFloatingNavOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !floatingNavMenu.hidden) { setFloatingNavOpen(false); floatingNavToggle.focus(); }
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const dialog = document.querySelector('.lightbox');
if (dialog) {
  const lightboxImage = dialog.querySelector('img');

  // Any .graphic-frame can open its own image in the shared full-screen viewer.
  document.querySelectorAll('.graphic-frame').forEach(frame => {
    frame.addEventListener('click', () => {
      const previewImage = frame.querySelector('img');
      lightboxImage.src = frame.dataset.lightboxSrc || previewImage?.src || '';
      lightboxImage.alt = frame.dataset.lightboxAlt || previewImage?.alt || 'Expanded graphic';
      dialog.showModal();
    });
  });

  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}
document.querySelector('#year').textContent = new Date().getFullYear();

// COOKIE CONSENT
// Keep the notice dismissed for one year after a visitor accepts it.
const cookieConsent = document.querySelector('#cookie-consent');
const cookieConsentButton = cookieConsent?.querySelector('.cookie-consent-accept');
const COOKIE_CONSENT_NAME = 'a4o_cookie_consent';
const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

const hasCookieConsent = () => {
  const cookieAccepted = document.cookie
    .split(';')
    .some(cookie => cookie.trim() === `${COOKIE_CONSENT_NAME}=accepted`);
  if (cookieAccepted) return true;

  try {
    return window.localStorage.getItem(COOKIE_CONSENT_NAME) === 'accepted';
  } catch {
    return false;
  }
};

if (cookieConsent && cookieConsentButton && !hasCookieConsent()) {
  cookieConsent.hidden = false;

  cookieConsentButton.addEventListener('click', () => {
    document.cookie = `${COOKIE_CONSENT_NAME}=accepted; Max-Age=${COOKIE_CONSENT_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
    try {
      window.localStorage.setItem(COOKIE_CONSENT_NAME, 'accepted');
    } catch {
      // The consent cookie remains the source of truth when storage is unavailable.
    }
    cookieConsent.hidden = true;
  });
}

/*
  TESTIMONIAL CAROUSEL — MANUAL EDITING
  Change 6500 to the desired number of milliseconds between slides.
  Examples: 5000 = 5 seconds, 8000 = 8 seconds.
*/
const TESTIMONIAL_INTERVAL_MS = 6500;
const testimonialCarousel = document.querySelector('.testimonial-carousel');

if (testimonialCarousel) {
  const slides = [...testimonialCarousel.querySelectorAll('.testimonial-slide')];
  const dots = [...testimonialCarousel.querySelectorAll('.testimonial-dot')];
  const previousButton = testimonialCarousel.querySelector('.testimonial-prev');
  const nextButton = testimonialCarousel.querySelector('.testimonial-next');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentSlide = 0;
  let rotationTimer;

  // Shows one slide and keeps the accessibility state and progress buttons in sync.
  const showSlide = index => {
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentSlide;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === currentSlide;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', String(active));
    });
  };

  const stopRotation = () => window.clearInterval(rotationTimer);
  const startRotation = () => {
    stopRotation();
    if (!reduceMotion) {
      rotationTimer = window.setInterval(() => showSlide(currentSlide + 1), TESTIMONIAL_INTERVAL_MS);
    }
  };

  previousButton.addEventListener('click', () => {
    showSlide(currentSlide - 1);
    startRotation();
  });
  nextButton.addEventListener('click', () => {
    showSlide(currentSlide + 1);
    startRotation();
  });
  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    showSlide(index);
    startRotation();
  }));

  // Pauses while someone reads or uses the controls.
  testimonialCarousel.addEventListener('mouseenter', stopRotation);
  testimonialCarousel.addEventListener('mouseleave', startRotation);
  testimonialCarousel.addEventListener('focusin', stopRotation);
  testimonialCarousel.addEventListener('focusout', startRotation);

  showSlide(0);
  startRotation();
}


