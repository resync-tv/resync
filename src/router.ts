import type { RouteRecordRaw } from "vue-router"
import { createRouter, createWebHistory } from "vue-router"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/ResyncHome.vue"),
  },
  {
    path: "/signup",
    name: "signup",
    component: () => import("./views/ResyncSignup.vue"),
  },
  {
    path: "/r/:roomID",
    redirect: { name: "room" },
  },
  {
    path: "/:roomID",
    name: "room",
    component: () => import("./views/ResyncRoom.vue"),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
