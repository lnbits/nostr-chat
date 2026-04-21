<template>
  <PostComposer
    button-label="Reply"
    placeholder="Post your reply"
    :submitting="submitting"
    @submit="$emit('submit', $event)"
  />
</template>

<script setup lang="ts">
import PostComposer from './PostComposer.vue';

interface Props {
  submitting?: boolean;
}

withDefaults(defineProps<Props>(), {
  submitting: false,
});

defineEmits<{
  submit: [content: string];
}>();
</script>
