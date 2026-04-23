import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0b2340",
          sea: "#1d4e89",
          foam: "#f4f7fb",
        },
      },
      minHeight: {
        touch: "3rem",
      },
    },
  },
  plugins: [],
};

export default config;
