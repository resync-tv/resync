import { defineConfig } from "vite-plugin-windicss"
import defaultTheme from "windicss/defaultTheme"

const { sans, mono } = defaultTheme.fontFamily

export default defineConfig({
  darkMode: "class",
  theme: {
    fontFamily: {
      ...defaultTheme.fontFamily,
      DEFAULT: ["ManropeVariable"],
      sans: ["ManropeVariable", ...sans],
      mono: ['"Roboto Mono"', ...mono],
    },
    extend: {
      colors: {
        dark: "var(--clr-dark)",
        "md-dark": "var(--clr-md-dark)",
        light: "var(--clr-light)",
        "md-light": "var(--clr-md-light)",
        accent: "var(--clr-accent)",
        error: "var(--clr-error)",
      },
      transitionTimingFunction: {
        "ease-in-out-hard": "var(--ease-in-out-hard)",
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
