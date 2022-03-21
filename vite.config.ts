import { join, resolve } from "path"
import { defineConfig } from "vite"

import vue from "@vitejs/plugin-vue"
import WindiCSS from "vite-plugin-windicss"
import { VitePWA } from "vite-plugin-pwa"
import { createSvgIconsPlugin } from "vite-plugin-svg-icons"

const PACKAGE_ROOT = __dirname

export default defineConfig({
  root: PACKAGE_ROOT,
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
      "/@/": join(PACKAGE_ROOT, "src") + "/",
      "/$/": join(PACKAGE_ROOT, "types") + "/",
    },
  },
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    emptyOutDir: true,
    brotliSize: false,
  },
})
