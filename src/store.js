import Vue from "vue"
import Vuex from "vuex"
import ls from "local-storage"

Vue.use(Vuex)

const default_settings = {
  name: "",
  lastroom: "",
}

export default new Vuex.Store({
  state: ls("store")
    ? Object.assign({}, default_settings, ls("store"))
    : default_settings,
  mutations: {
    set(state, [key, value]) {
      state[key] = value
      ls("store", state)
    },
  },
  actions: {},
})
