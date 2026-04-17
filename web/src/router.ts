import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/docs', component: () => import('./pages/Docs.vue') },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

export default router
