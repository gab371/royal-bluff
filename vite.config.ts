import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Force a single React instance in the Hub lib build (avoids useRef-null dual-React).
const reactAliases = {
  react: path.resolve(import.meta.dirname, "node_modules/react"),
  "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
  "react-dom/client": path.resolve(import.meta.dirname, "node_modules/react-dom/client"),
  "react/jsx-runtime": path.resolve(import.meta.dirname, "node_modules/react/jsx-runtime.js"),
  "react/jsx-dev-runtime": path.resolve(import.meta.dirname, "node_modules/react/jsx-dev-runtime.js"),
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';
  return {
    base: './',
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        ...(isLib ? reactAliases : {}),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': '{}',
    },
    build: isLib ? {
      outDir: 'dist',
      lib: {
        entry: path.resolve(import.meta.dirname, 'src/main.tsx'),
        name: 'GameRoyal',
        formats: ['es'],
        fileName: () => 'index.js'
      },
      // The hub + each game's mount() load `./games/<key>/style.css`, so emit
      // the extracted stylesheet as `style.css` (instead of `<package-name>.css`).
      rollupOptions: {
        output: { assetFileNames: 'style.css' },
      },
    } : {
      outDir: 'dist'
    }
  }
})
