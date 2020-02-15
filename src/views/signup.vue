<template lang="pug">
.signup
  .name
    .input
      input(v-model="nameinput" type="text" placeholder="name" autocomplete="off" autocorrect="off"
        autocapitalize="off" spellcheck="false" @keyup.enter="signup")
      span
    button.flat(@click="signup" :class="{ disabled: nameinput === ''}") set
</template>

<script>
import ls from "local-storage"
export default {
  name: "signup",
  data: () => ({
    nameinput: "",
  }),
  mounted() {
    this.nameinput = this.$store.state.name
  },
  methods: {
    signup() {
      if (this.nameinput === "") return
      this.$store.commit("set", ["name", this.nameinput])
      this.initsentry()
      this.$router.push(this.$route.query.returnto || "/", () => {
        location.reload()
      })
    },
  },
}
</script>

<style lang="stylus">
.signup
  height: 100%
  display: flex
  justify-content: center
  align-items: center
  position: relative

  .name
    width: 75%
    display: flex
    // justify-content: center
    align-items: center
    flex-direction: column

    .input
      flex-grow: 1
      width: 100%

      >input
        font-size: 4em
        text-align: center
        font-family: "Roboto Mono", monospace
        color: rgba(255, 255, 255, 0.5)
        transition: 0.5s ease
        font-weight: lighter

    button
      font-size: 4em
      margin-top: 75px
      flex-shrink: 1
</style>
