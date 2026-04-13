(() => {
  const THEME_KEY = "theme";
  const root = document.documentElement;

  const getSystemTheme = () => {
    try {
      return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch {
      return "dark";
    }
  };

  const getStoredTheme = () => {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  };

  const setTheme = (theme, { persist } = { persist: false }) => {
    root.dataset.theme = theme;
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // ignore storage failures (private mode / disabled storage)
      }
    }
  };

  const initTheme = () => {
    const stored = getStoredTheme();
    setTheme(stored ?? getSystemTheme(), { persist: false });

    // Keep in sync with OS theme only if user hasn't chosen explicitly.
    try {
      const mq = window.matchMedia?.("(prefers-color-scheme: light)");
      if (!mq) return;
      mq.addEventListener("change", () => {
        if (getStoredTheme() !== null) return;
        setTheme(getSystemTheme(), { persist: false });
      });
    } catch {
      // ignore
    }
  };

  const initYear = () => {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  };

  const initThemeToggle = () => {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const current = root.dataset.theme === "light" ? "light" : "dark";
      const next = current === "dark" ? "light" : "dark";
      setTheme(next, { persist: true });
    });
  };

  const initHeaderElevation = () => {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const update = () => {
      header.setAttribute("data-elevated", window.scrollY > 6 ? "true" : "false");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  const initActiveNav = () => {
    const navLinks = Array.from(document.querySelectorAll(".site-header .nav a[href^=\"#\"]"));
    if (navLinks.length === 0) return;

    const items = navLinks
      .map((link) => {
        const id = link.getAttribute("href")?.slice(1);
        if (!id) return null;
        const section = document.getElementById(id);
        if (!section) return null;
        return { id, link, section };
      })
      .filter(Boolean);

    if (items.length === 0) return;

    const setActive = (id) => {
      for (const item of items) item.link.removeAttribute("aria-current");
      const hit = items.find((x) => x.id === id);
      if (hit) hit.link.setAttribute("aria-current", "true");
    };

    let ticking = false;
    const update = () => {
      ticking = false;

      const offset = 120; // matches sticky header + comfortable buffer
      let active = items[0].id;
      for (const item of items) {
        const top = item.section.getBoundingClientRect().top;
        if (top - offset <= 0) active = item.id;
      }
      setActive(active);
    };

    update();
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  };

  const copyText = async (text) => {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / blocked clipboard.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const initCopyEmail = () => {
    const btn = document.getElementById("copyEmail");
    const status = document.getElementById("copyEmailStatus");
    if (!btn || !status) return;

    let t = null;
    const setStatus = (message) => {
      status.textContent = message;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        status.textContent = "";
        t = null;
      }, 1800);
    };

    btn.addEventListener("click", async () => {
      const email = btn.getAttribute("data-email");
      const ok = await copyText(email);
      setStatus(ok ? "Copied to clipboard." : "Copy failed. Please copy manually.");
    });
  };

  const initAOS = () => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
      false;
    if (reduced) return;
    if (!window.AOS?.init) return;
    window.AOS.init({
      once: true,
      offset: 80,
      duration: 550,
      easing: "ease-out-cubic",
    });
  };

  const initMobileMenu = () => {
    const toggle = document.getElementById("menuToggle");
    const dialog = document.getElementById("mobileMenu");
    if (!toggle || !dialog) return;

    const closeTargets = dialog.querySelectorAll("[data-close=\"true\"], [data-nav-close=\"true\"]");

    const setOpen = (open) => {
      dialog.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        // Focus the first link for quicker keyboard navigation
        const first = dialog.querySelector("a,button");
        first?.focus?.();
      } else {
        toggle.focus?.();
      }
    };

    toggle.addEventListener("click", () => setOpen(dialog.hidden));
    closeTargets.forEach((el) => el.addEventListener("click", () => setOpen(false)));

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (dialog.hidden) return;
      setOpen(false);
    });
  };

  initTheme();
  initYear();
  initThemeToggle();
  initHeaderElevation();
  initActiveNav();
  initCopyEmail();
  initMobileMenu();
  initAOS();
})();
