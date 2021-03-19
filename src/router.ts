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
]

const router = createRouter({
  // @ts-expect-error idk
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
