import Vue from "vue"
import Router from "vue-router"

Vue.use(Router)

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/room/:id",
      name: "room",
      component: require("./views/room.vue").default,
    },
    {
      path: "/signup",
      name: "signup",
      component: require("./views/signup.vue").default,
    },
    {
      path: "/",
      component: require("./views/frontpage.vue").default,
    },
    {
      path: "*",
      redirect: "/",
    },
    // {
    //   path: "/about",
    //   name: "about",
    //   // route level code-splitting
    //   // this generates a separate chunk (about.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () =>
    //     import(/* webpackChunkName: "about" */ "./views/About.vue"),
    // },
  ],
})
