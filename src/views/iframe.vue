<template lang="pug">
span iframe
</template>
<script>
export default {
  name: "w2g-iframe",
  mounted() {
    const self = this
    window.onmessage = ({ data }) => {
      if (data.type !== "w2g") return

      if (data.action === "addqueue")
        self.socket.emit("addqueue", [
          self.$store.state.lastroom,
          self.$youtube.getIdFromUrl(data.url),
        ])
    }
  },
}
</script>