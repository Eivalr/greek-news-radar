import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./app/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        radar: {
          ink: "#0B1D26",
          sea: "#1E4E5F",
          foam: "#DDE9EE",
          signal: "#E36414",
          mint: "#3A9D8F"
        }
      }
    }
  },
  plugins: []
};

export default config;
