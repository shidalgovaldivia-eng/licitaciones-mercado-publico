import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        ocean: "#0E5E6F",
        mint: "#D8F3DC",
        paper: "#F6F7FB",
        line: "#E5E7EB",
        alert: "#C2410C",
        graphite: "#27272A"
      },
      boxShadow: {
        subtle: "0 18px 45px rgba(15, 23, 42, 0.08)",
        premium: "0 24px 70px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
