// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  typescript: { typeCheck: true, strict: true },
  nitro: {
    entry:
      process.env.NODE_ENV == "production" ? undefined : "../preset/entry.development",
    preset: "./preset",
  },
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "resync",
      charset: "utf8",
    },
  },
})
