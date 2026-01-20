<script setup>
import Button from './button/Button.vue';
defineProps({
  title: {
    type: String,
    required: true,
  },
  buttons: {
    type: Array,
    default: () => [],
  },
  tabActive: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['click', 'close']);

const handleButtonClick = button => {
  emit('click', button);
};
</script>

<template>
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-n-weak h-12"
  >
    <div class="flex items-center justify-between gap-2 flex-1">
      <!-- <span class="font-medium text-sm text-n-slate-12">{{ title }}</span> -->
      <div class="flex items-center">
        <Button
          v-for="button in buttons"
          :key="button"
          icon="tabler-1"
          :variant="tabActive==button ? 'tonal' : 'ghost'"
          :label="button"
          md
          @click="handleButtonClick(button)"
        />
        
      </div>
      <Button class="justify-right"
          v-tooltip="$t('GENERAL.CLOSE')"
          icon="i-lucide-x"
          ghost
          sm
          @click="$emit('close')"
        />
    </div>
  </div>
</template>
