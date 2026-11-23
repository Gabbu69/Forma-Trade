(() => {
  const storageKey = "forma.appearance";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  function read() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return "system";
    }
  }
  function apply(value) {
    const choice = ["light", "dark"].includes(value) ? value : "system";
    const root = document.documentElement;
    root.dataset.appearance = choice;
    root.dataset.bsTheme =
      choice === "system" ? (system.matches ? "dark" : "light") : choice;
    const control = document.getElementById("appearance");
    if (control) {
      const dark = root.dataset.bsTheme === "dark";
      control.title = dark ? "Switch to light mode" : "Switch to dark mode";
      control.setAttribute("aria-label", control.title);
      const glyph = document.createElement("i");
      glyph.dataset.lucide = dark ? "moon" : "sun";
      glyph.setAttribute("aria-hidden", "true");
      control.replaceChildren(glyph);
      window.lucide?.createIcons({ root: control });
    }
    window.dispatchEvent(new Event("forma:appearance"));
  }
  apply(read());
  system.addEventListener("change", () =>
    apply(document.documentElement.dataset.appearance),
  );
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) apply(read());
  });
  document.addEventListener("DOMContentLoaded", () => {
    const control = document.getElementById("appearance");
    if (!control) return;
    apply(document.documentElement.dataset.appearance);
    control.addEventListener("click", () => {
      const choice = document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(storageKey, choice);
      } catch {}
      apply(choice);
    });
  });
})();
