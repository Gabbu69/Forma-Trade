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
    const select = document.getElementById("appearance");
    if (select) {
      select.value = choice;
      const label = select.closest("label");
      label.title = "Appearance · " + select.selectedOptions[0].text;
      const glyph = document.createElement("i");
      glyph.dataset.lucide = { system: "monitor", light: "sun", dark: "moon" }[
        choice
      ];
      glyph.setAttribute("aria-hidden", "true");
      label.querySelector("[data-lucide]").replaceWith(glyph);
      window.lucide?.createIcons({ root: label });
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
    control.addEventListener("change", () => {
      try {
        localStorage.setItem(storageKey, control.value);
      } catch {}
      apply(control.value);
    });
  });
})();
