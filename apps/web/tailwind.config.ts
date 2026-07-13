// apps/web/tailwind.config.ts
//
// Tokens de design propres au produit — jamais le thème shadcn par
// défaut. Ces valeurs sont la source de vérité pour tout composant
// futur (Phase 15 dashboard, Phase 18 suggestions, etc).

import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0B0E14",
        surface: "#141821",
        border: "#242938",
        foreground: "#E6E8EB",
        muted: "#8B92A3",
        primary: {
          DEFAULT: "#6C5CE7", // indigo — agent IA, actions primaires
          hover: "#5B4BD6",
        },
        success: "#3DD68C", // test passant
        danger: "#FF6B57", // test échoué
        warning: "#F5B942", // flaky / attention
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
} satisfies Config;
