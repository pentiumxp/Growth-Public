module.exports = {
  root: "frontend",
  build: {
    outDir: "../public/assets/growth",
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      input: "src/main.js",
      output: {
        entryFileNames: "growth.[hash].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[hash][extname]"
      }
    }
  }
};
