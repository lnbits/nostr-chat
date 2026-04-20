<template>
  <q-layout view="hHh Lpr fFf" class="auth-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 20%, rgba(29, 155, 240, 0.14), transparent 28%),
    radial-gradient(circle at 80% 10%, rgba(107, 192, 255, 0.08), transparent 24%),
    linear-gradient(180deg, #04070d 0%, #05080d 100%);
}
</style>
