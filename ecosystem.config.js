module.exports = {
  apps: [
    {
      script: "./lib/index.js",
      name: "w2g-next",
      node_args: "-r dotenv/config",
    },
  ],
}
