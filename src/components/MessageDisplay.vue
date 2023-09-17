<script setup>
import MessageContent from './MessageContent.vue';
import {onMounted, onUnmounted, watch} from 'vue';

// props
const props = defineProps({
  localMessages: {
    type: Array,
    default: () => ([]),
  },
  userBehavior: {
    type: Boolean,
    default: false,
  },
});

// emits
const emits = defineEmits(['toggleUserBehavior']);

// scroll
watch(() => props.localMessages, () => {
  if (props.userBehavior) {
    return;
  }
  const el = document.getElementById('chat-display');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}, {deep: true, immediate: false});
onMounted(() => {
  const el = document.getElementById('chat-display');
  if (el && !props.userBehavior) {
    el.addEventListener('wheel', () => {
      emits('toggleUserBehavior', true);
    });
  }
});
onUnmounted(() => {
  const el = document.getElementById('chat-display');
  if (el) {
    el.removeEventListener('wheel', () => {});
  }
});
</script>

<template>
  <a-space
    ref="chatDisplay"
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
