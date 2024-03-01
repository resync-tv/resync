<script setup lang="ts">
const socket = useSocket()

socket.on("echo", console.log)

const sendMessage = () => {
  socket.emit("echo", "Hello, world!")
}
</script>

<template>
  <div>
    <ClientOnly>
      <span>{{ socket.connected }}</span>
      <button @click="sendMessage">send</button>

      <template #fallback>
        <span>Connecting...</span>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped></style>
