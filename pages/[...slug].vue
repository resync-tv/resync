<script setup lang="ts">
import { DreamPlayer } from "@resync-tv/dream-player"
import "@resync-tv/dream-player/style.css"

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

      <DreamPlayer
        src="http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_60fps_normal.mp4"
      />
    </ClientOnly>
  </div>
</template>

<style scoped></style>
