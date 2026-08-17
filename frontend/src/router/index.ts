import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/create',
      name: 'create',
      component: () => import('@/views/CharacterCreatorView.vue'),
    },
    {
      path: '/create/:uuid',
      name: 'edit',
      component: () => import('@/views/CharacterCreatorView.vue'),
    },
    {
      path: '/character/:uuid',
      name: 'character',
      component: () => import('@/views/CharacterView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
});

export default router;
