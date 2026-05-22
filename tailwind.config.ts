import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        ocean: "#0E5E6F",
        mint: "#D8F3DC",
        paper: "#F7F8F3",
        line: "#DCE3DE",
        alert: "#C2410C"
      },
      boxShadow: {
        subtle: "0 18px 45px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
