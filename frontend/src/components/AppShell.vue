<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

const route = useRoute();
const settings = useSettingsStore();
const { theme } = storeToRefs(settings);
const searchQuery = ref('');

defineProps<{
  search?: string;
}>();

defineEmits<{
  'update:search': [value: string];
}>();
</script>

<template>
  <div class="flex h-screen flex-col bg-wiki-bg">
    <header class="wiki-header">
      <RouterLink to="/" class="wiki-header-brand">
        <svg class="h-6 w-6 text-wiki-accent" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.2l7.5 3.75L12 11.7 4.5 7.95 12 4.2zM4 8.8l7 3.5v7.4l-7-3.5V8.8zm9 10.9v-7.4l7-3.5v3.9l-7 3.5z" />
        </svg>
        <span>SW Assist</span>
      </RouterLink>

      <div class="wiki-header-center">
        <input
          :value="searchQuery"
          type="search"
          class="wiki-search"
          placeholder="Поиск персонажей..."
          @input="searchQuery = ($event.target as HTMLInputElement).value"
        />
      </div>

      <div class="wiki-header-actions">
        <RouterLink to="/create" class="btn-secondary px-3 py-1 text-xs normal-case">
          Новый персонаж
        </RouterLink>
        <RouterLink
          to="/settings"
          class="wiki-icon-btn"
          :class="{ 'bg-wiki-panelHover text-wiki-text': route.name === 'settings' }"
          title="Настройки"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </RouterLink>
        <button
          type="button"
          class="wiki-icon-btn"
          :title="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
          @click="settings.setTheme(theme === 'dark' ? 'light' : 'dark')"
        >
          <svg v-if="theme === 'dark'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <aside class="wiki-sidebar">
        <RouterLink to="/" class="wiki-sidebar-home" :class="{ 'wiki-tree-item-active': route.name === 'home' }">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Главная</span>
        </RouterLink>
        <RouterLink
          to="/create"
          class="wiki-tree-item"
          :class="{ 'wiki-tree-item-active': route.name === 'create' || route.name === 'edit' }"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Создание</span>
        </RouterLink>
        <div class="wiki-sidebar-label">Персонажи</div>
        <slot name="sidebar" />
      </aside>

      <main class="min-w-0 flex-1 overflow-y-auto bg-wiki-canvas">
        <slot />
      </main>
    </div>
  </div>
</template>
