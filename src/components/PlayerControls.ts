import { defineComponent, h } from "vue"

export default defineComponent({
  name: "PlayerControls",
  setup() {
    return () =>
      h(
        "p",
        {
          class: "text-white text-shadow",
        },
        "controls"
      )
  },
})

// TODO
