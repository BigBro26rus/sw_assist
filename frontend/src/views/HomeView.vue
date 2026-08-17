<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import { api, ApiError } from '@/api';
import type { CharacterSummary } from '@/types';

const characters = ref<CharacterSummary[]>([]);
const loading = ref(true);
const error = ref('');
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return characters.value;
  return characters.value.filter((c) => c.name.toLowerCase().includes(q));
});

onMounted(async () => {
  try {
    characters.value = await api.characters.list();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не удалось загрузить персонажей';
  } finally {
    loading.value = false;
  }
});

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('ru-RU');
}
</script>

<template>
  <AppShell>
    <template #sidebar>
      <RouterLink
        v-for="char in filtered"
        :key="char.uuid"
        :to="`/character/${char.uuid}`"
        class="wiki-tree-item"
      >
        <span class="truncate">{{ char.name }}</span>
      </RouterLink>
      <div v-if="!loading && !filtered.length" class="px-3 py-2 text-xs text-wiki-muted">
        Персонажей пока нет
      </div>
    </template>

    <div class="wiki-page">
      <h1 class="wiki-page-title">Генератор персонажей Savage Worlds</h1>

      <div v-if="loading" class="wiki-empty-state">Загрузка...</div>
      <div v-else-if="error" class="wiki-empty-state text-red-400">{{ error }}</div>
      <div v-else class="space-y-6">
        <div class="wiki-block">
          <div class="wiki-block-header wiki-block-header-accent">Быстрый старт</div>
          <div class="p-4 text-sm text-wiki-muted">
            Создайте нового персонажа или откройте сохранённого из списка слева.
          </div>
          <div class="border-t border-wiki-border px-4 py-3">
            <RouterLink to="/create" class="btn-primary">Создать персонажа</RouterLink>
          </div>
        </div>

        <div class="wiki-block">
          <div class="wiki-block-header wiki-block-header-dark">Сохранённые персонажи</div>
          <div v-if="!characters.length" class="wiki-empty-state py-8">Нет сохранённых персонажей</div>
          <div v-for="char in filtered" :key="char.uuid" class="wiki-block-row">
            <div class="flex-1">
              <div class="wiki-block-row-label">{{ char.name }}</div>
              <div class="text-xs text-wiki-muted">Обновлён: {{ formatDate(char.created) }}</div>
            </div>
            <div class="flex gap-2">
              <RouterLink :to="`/character/${char.uuid}`" class="btn-ghost px-2 py-1 text-xs">Просмотр</RouterLink>
              <RouterLink :to="`/create/${char.uuid}`" class="btn-ghost px-2 py-1 text-xs">Редактировать</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
