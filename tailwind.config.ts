import { defineConfig } from "vite-plugin-windicss"

export default defineConfig({
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#291d22",
        fg: "#f4bc20",
      },
    },
  },
})
