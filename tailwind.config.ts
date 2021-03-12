import { defineConfig } from "vite-plugin-windicss"

export default defineConfig({
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#1a1817",
        fg: "#ffffff",
        accent: "#e50150",
        "accent-alt": "#30AFD9",
      },
      fontFamily: {
        DEFAULT: ["Manrope"],
      },
    },
  },
  plugins: [require("windicss/plugin/aspect-ratio")],
})
