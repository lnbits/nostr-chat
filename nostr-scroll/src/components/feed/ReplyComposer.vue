<template>
  <PostComposer button-label="Reply" placeholder="Post your reply" @submit="$emit('submit', $event)" />
</template>

<script setup lang="ts">
import PostComposer from './PostComposer.vue';

defineEmits<{
  submit: [content: string];
}>();
</script>
