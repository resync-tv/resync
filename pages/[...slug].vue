<script setup lang="ts">
import { DreamPlayer } from "@resync-tv/dream-player";
import "@resync-tv/dream-player/style.css";
import type { YtDLP } from "@resync-tv/yt-dlp";

const socket = useSocket()

socket.on("echo", console.log)

const sendMessage = () => {
  socket.emit("echo", "Hello, world!")
}

const urlInput = ref("")
const ytInfo = ref("")
const getYtInfo = async () => {
  socket.emit("yt-dlp", urlInput.value, (info: YtDLP) => {
    ytInfo.value = info.title
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <span>{{ socket.connected }}</span>
      <button @click="sendMessage">send</button>

      <DreamPlayer
        src="http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_60fps_normal.mp4"
      />

      <div class="yt-dlp">
        <input v-model="urlInput" type="text" placeholder="url" />
        <button @click="getYtInfo">get info</button>
        <span>{{ ytInfo }}</span>
      </div>

      <template #fallback>
        <span>Connecting...</span>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped></style>
