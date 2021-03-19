import { defineConfig } from "vite-plugin-windicss"

export default defineConfig({
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: "#0C151D",
        white: "#FCFCFC",
        accent: "#BD4089",
        error: "#E3170A",
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
