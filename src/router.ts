import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/Home.vue"),
  },
  {
    path: "/r/:roomID",
    name: "room",
    component: () => import("./views/Room.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
]

const router = createRouter({
  // @ts-expect-error idk
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
