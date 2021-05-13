import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/Home.vue"),
  },
  {
    path: "/signup",
    name: "signup",
    component: () => import("./views/Signup.vue"),
  },
  {
    path: "/r/:roomID",
    redirect: { name: "room" },
  },
  {
    path: "/:roomID",
    name: "room",
    component: () => import("./views/Room.vue"),
  },
]

const router = createRouter({
  // @ts-expect-error idk, something about the tsconfig
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
