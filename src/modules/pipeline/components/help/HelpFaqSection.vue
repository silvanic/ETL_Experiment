<script setup lang="ts">
interface FaqItem {
  question: string
  answer: string
}

interface Props {
  title?: string
  items: FaqItem[]
}

withDefaults(defineProps<Props>(), {
  title: 'FAQ',
})
</script>

<template>
  <section v-if="items.length > 0" class="help-faq">
    <h3 class="help-faq-title">{{ title }}</h3>
    <div v-for="item in items" :key="item.question" class="help-faq-item">
      <p class="help-faq-question">{{ item.question }}</p>
      <p class="help-faq-answer">{{ item.answer }}</p>
    </div>
  </section>
</template>

<style scoped>
.help-faq {
  margin-top: 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--panel) 94%, #ffffff);
}

.help-faq-title {
  margin: 0 0 0.55rem;
  font-size: 0.94rem;
}

.help-faq-item + .help-faq-item {
  margin-top: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--border);
}

.help-faq-question {
  margin: 0 0 0.25rem;
  font-weight: 600;
}

.help-faq-answer {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
}
</style>
