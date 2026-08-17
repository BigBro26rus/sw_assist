<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import { api, ApiError } from '@/api';
import type { CharacterData } from '@/types';

const route = useRoute();
const character = ref<CharacterData | null>(null);
const loading = ref(true);
const error = ref('');

const uuid = computed(() => route.params.uuid as string);
const attrKeys = computed(() =>
  character.value
    ? Object.keys(character.value.characteristics as Record<string, unknown>).filter((k) => !k.includes('total'))
    : []
);

onMounted(async () => {
  try {
    character.value = await api.characters.get(uuid.value);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AppShell>
    <div class="wiki-page">
      <div v-if="loading" class="wiki-empty-state">Загрузка...</div>
      <div v-else-if="error" class="wiki-empty-state text-red-400">{{ error }}</div>
      <template v-else-if="character">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 class="wiki-page-title mb-0">{{ character.concept.name || 'Безымянный' }}</h1>
          <div class="flex gap-2">
            <RouterLink :to="`/create/${uuid}`" class="btn-secondary">Редактировать</RouterLink>
            <RouterLink to="/" class="btn-ghost">На главную</RouterLink>
          </div>
        </div>

        <div class="space-y-6">
          <div class="wiki-block">
            <div class="wiki-block-header wiki-block-header-accent">Описание</div>
            <div class="p-4 text-sm text-wiki-muted">
              {{ character.concept.description || 'Нет описания' }}
            </div>
          </div>

          <div class="wiki-block">
            <div class="wiki-block-header wiki-block-header-dark">Характеристики</div>
            <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="key in attrKeys"
                :key="key"
                class="rounded border border-wiki-border bg-wiki-panel px-3 py-2"
              >
                <div class="text-xs uppercase tracking-wider text-wiki-muted">{{ key }}</div>
                <div class="text-lg text-wiki-text">
                  {{ (character.characteristics as Record<string, { value: string }>)[key]?.value }}
                </div>
              </div>
            </div>
          </div>

          <div class="wiki-block">
            <div class="wiki-block-header wiki-block-header-green">Навыки</div>
            <div class="grid gap-2 p-4 sm:grid-cols-2">
              <div
                v-for="skill in (character.skills as Array<{ name: string; value: string }>)"
                :key="skill.name"
                class="flex items-center justify-between rounded border border-wiki-border px-3 py-2 text-sm"
              >
                <span>{{ skill.name }}</span>
                <span class="text-wiki-accent">{{ skill.value }}</span>
              </div>
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="wiki-block">
              <div class="wiki-block-header wiki-block-header-blue">Изъяны</div>
              <div class="space-y-2 p-4">
                <div
                  v-for="flaw in (character.starting_flaws as Array<{ name: string; points: number }>)"
                  :key="flaw.name"
                  class="flex justify-between text-sm"
                >
                  <span>{{ flaw.name }}</span>
                  <span class="text-wiki-muted">{{ flaw.points }} п.</span>
                </div>
              </div>
            </div>
            <div class="wiki-block">
              <div class="wiki-block-header wiki-block-header-accent">Черты</div>
              <div class="space-y-2 p-4">
                <div
                  v-for="trait in (character.starting_traits as Array<{ name: string; category_en?: string }>)"
                  :key="trait.name"
                  class="text-sm"
                >
                  <div>{{ trait.name }}</div>
                  <div v-if="trait.category_en" class="text-xs text-wiki-muted">{{ trait.category_en }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppShell>
</template>
