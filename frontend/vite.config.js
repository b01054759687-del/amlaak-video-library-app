import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative assets work on GitHub Pages subpath (/amlaak-video-library-app/)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
});
