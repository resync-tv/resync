import { computed, defineComponent, h, onMounted, ref, toRefs } from "vue"

export default defineComponent({
  name: "ResyncInput",
  props: {
    invalid: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "",
    },
    modelValue: {
      type: String,
      default: "",
    },
    pastable: {
      type: Boolean,
      default: false,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { invalid, placeholder, modelValue } = toRefs(props)

    const classList = computed(() => {
      const base = ["resync-input"]
      if (invalid.value) base.push("invalid")
      return base
    })

    const onContextmenu = async (event: MouseEvent) => {
      if (!props.pastable) return
      if (!navigator.clipboard.readText) return

      event.preventDefault()
      const value = await navigator.clipboard.readText()
      emit("update:modelValue", value)
    }

    const onKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === "Escape") return target?.blur?.()
    }

    const el = ref<HTMLInputElement | null>(null)
    onMounted(() => {
      if (!el.value) throw new Error("input ref is null")
      if (props.autofocus) {
        console.log("autofocus", el.value)
        el.value.focus()
      }
    })

    return () =>
      h("input", {
        onContextmenu,
        onKeydown,
        ref: el,
        onInput: (event: any) => emit("update:modelValue", event.target.value),
        value: modelValue.value,
        class: classList.value,
        placeholder: placeholder.value,
        type: "text",
        spellcheck: false,
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
      })
  },
})
