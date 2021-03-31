/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

const { send } = require("./deploy-succeeded")

const deployError = ({ error_message }) => `🛑 deploy error:\n${error_message}`

exports.handler = async function (event) {
  const { payload } = JSON.parse(event.body)

  await send(deployError(payload))

  return { statusCode: 200 }
}
