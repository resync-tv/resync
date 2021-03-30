import { defineConfig } from "vite-plugin-windicss"

export default defineConfig({
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: "var(--clr-dark)",
        "md-dark": "var(--clr-md-dark)",
        light: "var(--clr-light)",
        "md-light": "var(--clr-md-light)",
        accent: "var(--clr-accent)",
        error: "var(--clr-error)",
      },
      fontFamily: {
        DEFAULT: ["Manrope"],
      },
      height: {
        nav: "var(--nav-height)",
      },
      inset: {
        half: "50%",
      },
      spacing: {
        half: "50%",
      },
    },
  },
  plugins: [require("windicss/plugin/aspect-ratio")],
})
