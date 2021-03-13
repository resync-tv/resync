import { computed, defineComponent, h, PropType, toRefs } from "vue"
import { MediaVideo } from "../../types/mediaSource"

export default defineComponent({
  props: {
    source: { type: Object as PropType<MediaVideo>, required: true },
  },
  setup(props) {
    const { source } = toRefs(props)
    const src = computed(() => source.value.video[0].url)
    console.log(src)

    return () =>
      h("video", {
        src: src.value,
        class: ["max-w-3xl"],
      })
  },
})
