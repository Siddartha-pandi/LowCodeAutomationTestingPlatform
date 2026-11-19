/** @type {import('tailwindcss').Config} */

const monochrome = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
};

module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      black: "#000000",
      white: "#ffffff",

      // Universal monochrome grayscale mappings - strictly zero extra colors
      slate: monochrome,
      gray: monochrome,
      zinc: monochrome,
      neutral: monochrome,
      stone: monochrome,

      blue: monochrome,
      emerald: monochrome,
      green: monochrome,
      red: monochrome,
      rose: monochrome,
      amber: monochrome,
      yellow: monochrome,
      purple: monochrome,
      indigo: monochrome,
      violet: monochrome,
      cyan: monochrome,
      teal: monochrome,
      orange: monochrome,
      sky: monochrome,
      pink: monochrome,
      fuchsia: monochrome,
      lime: monochrome,

      brand: {
        blue: "#000000",
        "blue-hover": "#262626",
        "blue-subtle": "#f5f5f5",
      },
      navy: {
        900: "#0a0a0a",
        950: "#000000",
      },
    },
    extend: {},
  },
  plugins: [],
};
