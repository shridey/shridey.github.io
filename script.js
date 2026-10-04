(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeFavicon = document.querySelector('#theme-favicon');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('shridey-theme');

  const applyTheme = (theme) => {
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.dataset.theme = theme;
    }
    const dark = theme === 'dark' || (theme === 'system' && prefersDark.matches);
    themeMeta?.setAttribute('content', dark ? '#12110f' : '#fbfaf7');
    themeFavicon?.setAttribute('href', dark ? 'assets/logo-dark-icon.png' : 'assets/logo-light-icon.png');
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

  // Tiny keyboard easter egg: T toggles theme (outside form fields).
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 't') return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    themeToggle?.click();
  });
})();
