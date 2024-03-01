<script setup lang="ts">
const socket = useSocket()

socket.on("echo", console.log)

const sendMessage = () => {
  socket.emit("echo", "Hello, world!")
}
</script>

<template>
  <div>
    <span>{{ socket.connected }}</span>
    <button @click="sendMessage">send</button>
  </div>
</template>

<style scoped></style>
