<template>
  <a-space
    :fill="true"
    id="home"
  >
    <a-space
      id="home-space"
      direction="vertical"
    >
      <h2 id="home-space-title">
        Hello
      </h2>
    </a-space>
  </a-space>
</template>

<script setup>
</script>

<style scoped>
#home {
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
}

#home-space {
  box-shadow: var(--shadow2-center);
  padding: 60px 80px;
  align-items: center;
  border-radius: var(--border-radius-medium);
}

#home-space-title {
  font-size: 24px;
  color: var(--color-neutral-10);
  margin: 0;
}
</style>
