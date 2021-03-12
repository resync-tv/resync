import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/r/:roomID",
    name: "room",
    component: () => import("./views/Room.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/r/example",
  },
  // {
  //   path: "/about",
  //   name: "About",
  //   // route level code-splitting
  //   // this generates a separate chunk (about.[hash].js) for this route
  //   // which is lazy-loaded when the route is visited.
  //   component: () => import(/* webpackChunkName: "about" */ ".@/views/About.vue"),
  // },
]

const router = createRouter({
  // @ts-expect-error idk
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
