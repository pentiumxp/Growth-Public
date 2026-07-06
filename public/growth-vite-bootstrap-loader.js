(function loadGrowthViteBootstrap() {
  const manifestUrl = "/assets/growth/.vite/manifest.json";

  function loadEntry(entryFile) {
    if (!entryFile || /^(?:[a-z]+:|\/|\\)/i.test(entryFile)) return;
    const script = document.createElement("script");
    script.type = "module";
    script.async = true;
    script.src = `/assets/growth/${entryFile}`;
    script.dataset.growthViteBootstrap = "true";
    document.head.appendChild(script);
  }

  fetch(manifestUrl, { credentials: "same-origin", cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest) => {
      const entry = manifest && manifest["src/main.js"];
      loadEntry(entry && entry.file);
    })
    .catch(() => {});
}());
