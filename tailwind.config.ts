import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#07111a",
          900: "#0c1724",
          850: "#132030",
          800: "#1a2b3d",
          700: "#24354a",
        },
        gold: {
          500: "#c8a45d",
          400: "#d9bd7d",
          300: "#ead8af",
        },
        risk: {
          unacceptable: "#dc6b6b",
          high: "#cb7a47",
          limited: "#c2a438",
          minimal: "#4e9b74",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(217, 189, 125, 0.18), 0 24px 80px rgba(7, 17, 26, 0.18)",
        risk: "0 0 38px rgba(201, 164, 93, 0.14)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
      animation: {
        pulseRing: "pulseRing 2.2s ease-out infinite",
        slideUp: "slideUp 0.5s ease-out both",
        shimmer: "shimmer 2.1s linear infinite",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(214, 170, 79, 0.35)" },
          "70%": { boxShadow: "0 0 0 14px rgba(214, 170, 79, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(214, 170, 79, 0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
