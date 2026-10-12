(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('shridey-theme');

  const applyTheme = (theme) => {
    const resolvedTheme = theme === 'system'
      ? (prefersDark.matches ? 'dark' : 'light')
      : theme;

    root.dataset.theme = resolvedTheme;

    const dark = resolvedTheme === 'dark';
    themeMeta?.setAttribute('content', dark ? '#12110f' : '#fbfaf7');
    themeToggle?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  };

  applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system');

  themeToggle?.addEventListener('click', () => {
    const currentDark = root.dataset.theme === 'dark' || (!root.dataset.theme && prefersDark.matches);
    const next = currentDark ? 'light' : 'dark';
    localStorage.setItem('shridey-theme', next);
    applyTheme(next);
  });

  prefersDark.addEventListener('change', () => {
    if (!localStorage.getItem('shridey-theme')) applyTheme('system');
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  const renderIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });
    }
  };
  renderIcons();

  // One-set infinite marquee: move the first visual pair to the end as soon as it
  // leaves the viewport. Because the DOM order is updated before the transform is
  // reset, the first item literally follows the last with no midpoint restart.
  const marqueeBand = document.querySelector('.marquee-band');
  const marqueeSet = document.querySelector('.marquee-set');
  if (marqueeBand && marqueeSet && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let offset = 0;
    let lastTime = performance.now();
    let rafId = 0;
    let paused = false;

    const getGap = () => {
      const styles = getComputedStyle(marqueeSet);
      return parseFloat(styles.columnGap || styles.gap || '0') || 0;
    };

    const frame = (time) => {
      const delta = Math.min(64, time - lastTime);
      lastTime = time;

      if (!paused) {
        // Pixels per second. Keep the motion subtle and readable.
        offset += delta * 0.055;

        const first = marqueeSet.firstElementChild;
        const second = first?.nextElementSibling;
        if (first && second) {
          const step = first.getBoundingClientRect().width
            + second.getBoundingClientRect().width
            + getGap() * 2;

          if (offset >= step) {
            marqueeSet.append(first, second);
            offset -= step;
          }
        }

        marqueeSet.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }

      rafId = requestAnimationFrame(frame);
    };

    marqueeBand.addEventListener('mouseenter', () => { paused = true; }, { passive: true });
    marqueeBand.addEventListener('mouseleave', () => { paused = false; lastTime = performance.now(); }, { passive: true });
    marqueeBand.addEventListener('touchstart', () => { paused = true; }, { passive: true });
    marqueeBand.addEventListener('touchend', () => { paused = false; lastTime = performance.now(); }, { passive: true });
    window.addEventListener('resize', () => {
      lastTime = performance.now();
    }, { passive: true });

    rafId = requestAnimationFrame(frame);
    window.addEventListener('pagehide', () => cancelAnimationFrame(rafId), { once: true });
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Small pointer glow: playful, but intentionally subtle.
  const glow = document.querySelector('.cursor-glow');
  window.addEventListener('pointermove', (event) => {
    if (!glow) return;
    glow.animate(
      { left: `${event.clientX}px`, top: `${event.clientY}px` },
      { duration: 450, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }, { passive: true });

  // Gentle card tilt on fine pointers.
  document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (!window.matchMedia('(pointer:fine)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  // Testimonials are loaded from the Google Apps Script API; no testimonial copy is hardcoded in HTML.
  const CONTENT_API = 'https://script.google.com/macros/s/AKfycbxxRId27mhFAhYkTRvinua7QLaqOmKq0pusmeEHtsmpqUr1GNBiFw473BVCCBgYTdcD/exec';
  const testimonialStage = document.getElementById('testimonial-stage');
  const testimonialDialog = document.getElementById('testimonial-dialog');
  const testimonialForm = document.getElementById('testimonial-form');
  const testimonialStatus = document.getElementById('testimonial-form-status');
  const submitTestimonialButton = document.getElementById('submit-testimonial-form');
  const testimonialSubmitFrame = document.querySelector('iframe[name="testimonial-submit-frame"]');
  let loadedTestimonials = [];
  let activeSubmissionNonce = null;
  let submissionTimeout = null;

  const safeHttpUrl = (value) => {
    if (!value) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  };

  const createTestimonialCard = (testimonial) => {
    const card = makeElement('article', 'testimonial-note testimonial-note-main');
    const pin = makeElement('div', 'testimonial-pin');
    pin.setAttribute('aria-hidden', 'true');
    const icon = makeElement('div', 'testimonial-icon');
    icon.setAttribute('aria-hidden', 'true');
    const iconElement = document.createElement('i');
    iconElement.setAttribute('data-lucide', 'message-circle-heart');
    iconElement.className = 'icon';
    icon.append(iconElement);

    const copy = makeElement('div', 'testimonial-copy');
    const source = String(testimonial.source).trim();
    const via = String(testimonial.via).trim();
    const sourceLabel = source + " · " + via;
    copy.append(makeElement('span', 'testimonial-label', sourceLabel));

    const blockquote = document.createElement('blockquote');
    blockquote.append(makeElement('p', '', `“${String(testimonial.content || '').trim()}”`));
    copy.append(blockquote);

    const signoff = makeElement('div', 'testimonial-signoff');
    const name = String(testimonial.name || 'A kind human').trim();
    const avatar = makeElement('span', 'avatar-dot', name.charAt(0).toUpperCase() || '?');
    avatar.setAttribute('aria-hidden', 'true');
    const person = document.createElement('div');
    person.append(makeElement('strong', '', name));
    const metadata = [testimonial.role, testimonial.tagline, testimonial.date].filter(value => String(value || '').trim()).map(value => String(value).trim());
    person.append(makeElement('small', '', metadata.join(' · ')));
    signoff.append(avatar, person);
    copy.append(signoff);

    const profileUrl = safeHttpUrl(String(testimonial['profile-url'] || ''));
    if (profileUrl) {
      const link = makeElement('a', 'testimonial-link', `Visit ${name}'s Profile`);
      link.href = profileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const arrow = document.createElement('i');
      arrow.setAttribute('data-lucide', 'arrow-up-right');
      arrow.className = 'icon icon-xs';
      arrow.setAttribute('aria-hidden', 'true');
      link.append(' ', arrow);
      copy.append(link);
    }

    card.append(pin, icon, copy);
    return card;
  };

  const showTestimonialLoadError = () => {
    if (!testimonialStage) return;
    testimonialStage.classList.remove('is-loading');
    testimonialStage.classList.add('is-error');
    testimonialStage.setAttribute('aria-busy', 'false');
    testimonialStage.replaceChildren();
    const message = makeElement('div', 'testimonial-error');
    message.append(makeElement('p', '', 'Couldn’t load the kind words just now. Please try again.'));
    const retry = makeElement('button', 'button button-quiet', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', loadTestimonials);
    message.append(retry);
    testimonialStage.append(message);
  };

  const renderTestimonials = (showLoading = false) => {
    if (!testimonialStage) return;
    testimonialStage.classList.remove('is-error');
    testimonialStage.classList.toggle('is-loading', showLoading);
    testimonialStage.setAttribute('aria-busy', showLoading ? 'true' : 'false');
    if (showLoading) return;

    // Only testimonials explicitly approved in Google Sheets (featured = TRUE) are public.
    const unique = loadedTestimonials.filter(item => item && (item.featured === true || String(item.featured).trim().toLowerCase() === 'true'));
    testimonialStage.replaceChildren();
    if (!unique.length) {
      const empty = makeElement('div', 'testimonial-error');
      empty.append(makeElement('p', '', 'No testimonials yet. Want to be the first to leave a few kind words?'));
      testimonialStage.append(empty);
    } else {
      unique.forEach(item => testimonialStage.append(createTestimonialCard(item)));
    }
    renderIcons();
  };

  async function loadTestimonials() {
    if (!testimonialStage) return;
    renderTestimonials(true);
    try {
      const response = await fetch(CONTENT_API, { method: 'GET', cache: 'no-store' });
      if (!response.ok) throw new Error(`Content API returned ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.testimonials)) throw new Error('Testimonials collection missing from API response');
      loadedTestimonials = data.testimonials.filter(item => item && String(item.content || '').trim());
      renderTestimonials(false);
    } catch (error) {
      console.error('Unable to load testimonials:', error);
      showTestimonialLoadError();
    }
  }

  const openTestimonialDialog = () => {
    if (!testimonialDialog) return;
    testimonialStatus.textContent = '';
    testimonialStatus.className = 'testimonial-form-status';
    if (typeof testimonialDialog.showModal === 'function') testimonialDialog.showModal();
    else testimonialDialog.setAttribute('open', '');
    document.getElementById('testimonial-name')?.focus();
  };
  const closeTestimonialDialog = () => {
    if (!testimonialDialog) return;
    if (typeof testimonialDialog.close === 'function') testimonialDialog.close();
    else testimonialDialog.removeAttribute('open');
  };

  document.getElementById('open-testimonial-form')?.addEventListener('click', openTestimonialDialog);
  document.getElementById('close-testimonial-form')?.addEventListener('click', closeTestimonialDialog);
  document.getElementById('cancel-testimonial-form')?.addEventListener('click', closeTestimonialDialog);
  testimonialDialog?.addEventListener('click', (event) => {
    if (event.target === testimonialDialog) closeTestimonialDialog();
  });

  // Apps Script web apps redirect their responses cross-origin. A regular fetch POST
  // can be blocked by browser CORS, so submit a normal form to a hidden iframe and use
  // a one-time nonce in postMessage to receive a trustworthy success/failure result.
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.type !== 'shridey-testimonial-submit' || !activeSubmissionNonce || message.nonce !== activeSubmissionNonce) return;
    activeSubmissionNonce = null;
    if (submissionTimeout) window.clearTimeout(submissionTimeout);
    submissionTimeout = null;
    submitTestimonialButton.disabled = false;
    submitTestimonialButton.innerHTML = 'Send kind words <i data-lucide="send" class="icon icon-sm" aria-hidden="true"></i>';
    renderIcons();

    if (!message.success || !message.testimonial) {
      testimonialStatus.textContent = message.message || 'Your words could not be saved. Please check the details and try again.';
      testimonialStatus.className = 'testimonial-form-status is-error';
      return;
    }

    // New submissions are saved with featured=false and stay hidden until approved in Sheets.
    testimonialForm.reset();
    testimonialStatus.textContent = 'Thanks for sharing your words! Your testimonial has been submitted for review. If approved, it will appear here.';
    testimonialStatus.className = 'testimonial-form-status is-success';
  });

  testimonialForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!testimonialForm.reportValidity() || activeSubmissionNonce) return;

    const profileUrl = testimonialForm.elements['profile-url'].value.trim();
    if (profileUrl && !safeHttpUrl(profileUrl)) {
      testimonialForm.elements['profile-url'].setCustomValidity('Enter a valid http:// or https:// URL.');
      testimonialForm.elements['profile-url'].reportValidity();
      testimonialForm.elements['profile-url'].addEventListener('input', () => testimonialForm.elements['profile-url'].setCustomValidity(''), { once: true });
      return;
    }

    const nonceBytes = new Uint8Array(18);
    crypto.getRandomValues(nonceBytes);
    activeSubmissionNonce = Array.from(nonceBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    testimonialStatus.textContent = 'Sending your words…';
    testimonialStatus.className = 'testimonial-form-status';
    submitTestimonialButton.disabled = true;
    submitTestimonialButton.textContent = 'Sending…';

    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = CONTENT_API;
    postForm.target = testimonialSubmitFrame.name;
    postForm.acceptCharset = 'UTF-8';
    postForm.hidden = true;
    const payload = {
      name: testimonialForm.elements.name.value.trim(),
      role: testimonialForm.elements.role.value.trim(),
      tagline: testimonialForm.elements.tagline.value.trim(),
      'profile-url': profileUrl,
      content: testimonialForm.elements.content.value.trim(),
      website: testimonialForm.elements.website.value,
      nonce: activeSubmissionNonce
    };
    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      postForm.append(input);
    });
    document.body.append(postForm);
    postForm.submit();
    postForm.remove();

    submissionTimeout = window.setTimeout(() => {
      if (!activeSubmissionNonce) return;
      activeSubmissionNonce = null;
      submitTestimonialButton.disabled = false;
      submitTestimonialButton.textContent = 'Send kind words';
      testimonialStatus.textContent = 'We didn’t receive a confirmation. Please check your connection before trying again, so you don’t accidentally submit twice.';
      testimonialStatus.className = 'testimonial-form-status is-error';
    }, 25000);
  });

  loadTestimonials();

  // Tiny keyboard easter egg: T toggles theme (outside form fields).
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 't') return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    themeToggle?.click();
  });
})();
