import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "text-green-400",
    "bg-green-500/10",
    "text-orange-400",
    "bg-orange-500/10",
    "text-red-400",
    "bg-red-500/10",
    "text-blue-400",
    "bg-blue-500/10",
    "bg-green-500",
    "bg-orange-400",
    "bg-red-500",
    "bg-blue-500",
  ],
  theme: {
    extend: {
      colors: {
        moto: {
          orange: "#FF6B35",
          "orange-dark": "#E55A2B",
          "orange-light": "#FF8C5A",
        },
        dark: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1A1A1A",
          700: "#262626",
          600: "#404040",
          500: "#525252",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
