(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector("[data-theme-toggle]");
  let savedTheme;
  try { savedTheme = localStorage.getItem("portfolio-theme"); } catch (_) {}

  if (savedTheme === "dark" || savedTheme === "light") {
    root.dataset.theme = savedTheme;
  }

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    themeToggle.setAttribute("aria-pressed", String(next === "dark"));
    try { localStorage.setItem("portfolio-theme", next); } catch (_) {}
  });
  themeToggle?.setAttribute("aria-pressed", String(savedTheme === "dark"));

  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
      observer.observe(element);
    });
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }

  const canvas = document.querySelector("#signal-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let frame = 0;
  let points = [];

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.max(34, Math.round(width / 10));
    points = Array.from({ length: count }, (_, index) => {
      const cluster = index < count * 0.62;
      const theta = Math.random() * Math.PI * 2;
      const radius = cluster ? Math.random() * width * 0.22 : Math.random() * width * 0.45;
      return {
        x: width * 0.5 + Math.cos(theta) * radius,
        y: height * (cluster ? 0.48 : 0.55) + Math.sin(theta) * radius * 0.72,
        size: 1 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        orange: Math.random() > 0.82,
      };
    });
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    const time = frame * 0.012;
    const cx = width * 0.5;
    const cy = height * 0.48;
    const sweep = (time % (Math.PI * 2)) - Math.PI;

    context.save();
    context.translate(cx, cy);
    context.rotate(sweep);
    const gradient = context.createLinearGradient(0, 0, width * 0.42, 0);
    gradient.addColorStop(0, "rgba(199,255,69,0.02)");
    gradient.addColorStop(0.7, "rgba(199,255,69,0.12)");
    gradient.addColorStop(1, "rgba(199,255,69,0)");
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, width * 0.48, -0.28, 0.28);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.restore();

    points.forEach((point) => {
      const pulse = 0.55 + Math.sin(time * 2 + point.phase) * 0.35;
      context.beginPath();
      context.arc(point.x, point.y, point.size * pulse, 0, Math.PI * 2);
      context.fillStyle = point.orange
        ? `rgba(255,93,46,${0.35 + pulse * 0.45})`
        : `rgba(199,255,69,${0.22 + pulse * 0.48})`;
      context.fill();
    });

    context.strokeStyle = "rgba(199,255,69,.36)";
    context.lineWidth = 1;
    [0.12, 0.22, 0.32].forEach((radius) => {
      context.beginPath();
      context.arc(cx, cy, width * radius, 0, Math.PI * 2);
      context.stroke();
    });

    frame += 1;
    if (!reducedMotion) requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", () => { resize(); if (reducedMotion) draw(); }, { passive: true });
})();
