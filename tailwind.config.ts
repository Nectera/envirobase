import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0fdf0",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#7BC143",
          500: "#7BC143",
          600: "#6aad38",
          700: "#55892d",
          800: "#446e24",
          900: "#2d4a18",
        },
        xtract: {
          green: "#7BC143",
          "green-dark": "#6aad38",
          blue: "#0068B5",
          "blue-light": "#e8f4fd",
        },
        asbestos: "#6366f1",
        lead: "#f59e0b",
        meth: "#ef4444",
        mold: "#06b6d4",
        demo: "#8b5cf6",
        sidebar: {
          bg: "#0f172a",
          hover: "#1e293b",
          border: "#1e293b",
        },
      },
      borderRadius: {
        "soft": "14px",
        "soft-lg": "20px",
        "soft-xl": "24px",
      },
      boxShadow: {
        "soft": "0 2px 12px rgba(0, 0, 0, 0.04)",
        "soft-md": "0 4px 20px rgba(0, 0, 0, 0.06)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.08)",
        "float": "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        "green-glow": "0 2px 12px rgba(123, 193, 67, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
