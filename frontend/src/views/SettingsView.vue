<script setup lang="ts">
import { storeToRefs } from 'pinia';
import AppShell from '@/components/AppShell.vue';
import { useSettingsStore, type Theme } from '@/stores/settings';

const settings = useSettingsStore();
const { theme } = storeToRefs(settings);

function setTheme(value: Theme) {
  settings.setTheme(value);
}
</script>

<template>
  <AppShell>
    <div class="wiki-page">
      <h1 class="wiki-page-title mb-8">Настройки</h1>

      <div class="max-w-2xl">
        <div class="wiki-block">
          <div class="wiki-block-header wiki-block-header-dark">Оформление</div>
          <div class="wiki-block-row">
            <div class="flex-1">
              <div class="wiki-block-row-label">Тема</div>
              <p class="mt-1 text-sm text-wiki-muted">Светлая или тёмная цветовая схема интерфейса</p>
            </div>
            <div class="wiki-tabs">
              <button
                type="button"
                class="wiki-tab"
                :class="{ 'wiki-tab-active': theme === 'dark' }"
                @click="setTheme('dark')"
              >
                Тёмная
              </button>
              <button
                type="button"
                class="wiki-tab"
                :class="{ 'wiki-tab-active': theme === 'light' }"
                @click="setTheme('light')"
              >
                Светлая
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
