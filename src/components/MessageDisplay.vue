<script setup>
import MessageContent from './MessageContent.vue';
import {ref, watch} from 'vue';

const props = defineProps({
  localMessages: {
    type: Array,
    default: () => ([]),
  },
});

const userBehavior = ref(false);
watch(() => props.localMessages, () => {
  if (userBehavior.value) {
    return;
  }
  const el = document.getElementById('chat-display');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}, {deep: true, immediate: false});
</script>

<template>
  <a-space
    id="chat-display"
    :size="[20, 20]"
    class="chat-display"
    direction="vertical"
    v-show="localMessages.length > 0"
  >
    <message-content
      v-for="message in localMessages"
      :key="message"
      :message="message"
    />
  </a-space>
  <div
    class="chat-display"
    style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center"
    v-show="localMessages.length === 0"
  >
    <div style="width: 60px; height: 60px">
      <img
        alt="ChatGPT Logo"
        src="/chatgpt.png"
        style="max-width: 100%; max-height: 100%"
      >
    </div>
  </div>
</template>

<style scoped>
.chat-display {
  min-width: 100%;
  height: 100%;
  overflow-y: scroll;
  padding: 0 20px;
  box-sizing: border-box;
  scroll-behavior: smooth;
}
</style>
