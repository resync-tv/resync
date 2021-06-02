import { resolve } from "path"
import { defineConfig } from "vite"

import vue from "@vitejs/plugin-vue"
import WindiCSS from "vite-plugin-windicss"
import viteSvgIcons from "vite-plugin-svg-icons"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    vue(),
    WindiCSS({
      scan: {
        fileExtensions: ["vue", "html", "ts"],
      },
    }),
    viteSvgIcons({
      iconDirs: [resolve(process.cwd(), "src/assets/icons")],
      symbolId: "icon-[dir]-[name]",
    }),
    VitePWA({
      registerType: "autoUpdate",
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      $: resolve(__dirname, "./types"),
    },
  },
  build: {
    sourcemap: true,
  },
})
