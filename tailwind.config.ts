import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Sainte Genevieve Riverboat brand.
         * Sampled directly from the official reversed logo.
         *
         *   moss    — primary deep forest green (logo background)
         *   cream   — primary warm off-white (logo linework)
         *   brass   — warm gold for CTAs and accents
         */
        brand: {
          moss: {
            DEFAULT: "#303820", // sampled from logo
            50: "#f0f1ec",
            100: "#d8dcce",
            200: "#b2b9a0",
            300: "#8b9673",
            400: "#6a7658",
            500: "#4c5740",
            600: "#3d4732",
            700: "#303820", // canonical
            800: "#22281a",
            900: "#151a10",
            950: "#0b0e07",
          },
          cream: {
            DEFAULT: "#e8e8d8", // sampled from logo
            50: "#fbfbf6",
            100: "#f4f3ea",
            200: "#e8e8d8", // canonical
            300: "#d5d5bc",
            400: "#bcbc9c",
            500: "#a3a37f",
            600: "#8a8a67",
            700: "#6d6d52",
            800: "#4f4f3c",
            900: "#33332a",
          },
          brass: {
            DEFAULT: "#c8a968",
            50: "#fbf7ec",
            100: "#f4ebcf",
            200: "#e8d7a0",
            300: "#d9bf78",
            400: "#c8a968", // canonical
            500: "#b08f4c",
            600: "#8a6f3a",
            700: "#66522a",
            800: "#4a3c1e",
          },
        },
      },
      minHeight: {
        touch: "3rem",
      },
      fontFamily: {
        // System UI stack; swap for a serif display face later if desired
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
