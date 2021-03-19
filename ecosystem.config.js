module.exports = {
  apps: [
    {
      script: "./lib/index.js",
      name: "resync",
      node_args: "-r dotenv/config",
    },
  ],
}
