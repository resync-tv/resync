import { resolve } from "path"
import { defineConfig } from "vite"

import vue from "@vitejs/plugin-vue"
import WindiCSS from "vite-plugin-windicss"
import { VitePWA } from "vite-plugin-pwa"
import { createSvgIconsPlugin } from "vite-plugin-svg-icons"

export default defineConfig({
  plugins: [
    vue(),
    WindiCSS({
      scan: {
        fileExtensions: ["vue", "html", "ts"],
      },
    }),
    createSvgIconsPlugin({
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
