import { defineConfig } from "vite-plugin-windicss"

export default defineConfig({
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: "var(--clr-black)",
        "light-black": "var(--clr-light-black)",
        white: "var(--clr-white)",
        "light-white": "var(--clr-light-white)",
        accent: "var(--clr-accent)",
        error: "var(--clr-error)",
      },
      fontFamily: {
        DEFAULT: ["Manrope"],
      },
      height: {
        nav: "56px",
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
