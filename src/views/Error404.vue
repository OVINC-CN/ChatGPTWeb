<template>
  <a-empty id="error-404">
    <span id="error-404-desc">
      {{ $t('PageNotExist') }}
    </span>
    <template #image>
      <icon-tool id="error-404-icon" />
    </template>
  </a-empty>
</template>

<script setup />

<style scoped>
#error-404 {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

#error-404-desc {
  font-size: 24px;
}

#error-404-icon {
  font-size: 48px;
}
</style>
