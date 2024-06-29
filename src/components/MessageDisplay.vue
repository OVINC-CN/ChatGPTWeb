<script setup>
import MessageContent from './MessageContent.vue';
import {onMounted, onUnmounted, watch} from 'vue';
import {Role} from '@/constants';

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
  promptForm: {
    type: Object,
    default: () => ({
      content: '',
    }),
  },
  systemDefine: {
    type: String,
    default: '',
  },
  chatLoading: {
    type: Boolean,
    default: false,
  },
});

// emits
const emits = defineEmits(['toggleUserBehavior', 'reGenerate']);

// scroll
const doScroll = () => {
  if (props.userBehavior) {
    return;
  }
  const el = document.getElementById('chat-display');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
};
watch(() => props.localMessages, () => {
  doScroll();
}
, {deep: true, immediate: true});
watch(() => props.promptForm.content, () => {
  doScroll();
}, {deep: true, immediate: true});
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
    v-show="localMessages.length > 0 || systemDefine"
  >
    <message-content
      v-if="systemDefine"
      :message="{role: 'system', content: systemDefine}"
    />
    <message-content
      v-for="(message, index) in localMessages"
      :key="message"
      :message="message"
      :is-last="index === localMessages.length - 1"
      :chat-loading="chatLoading"
      @re-generate="emits('reGenerate')"
    />
    <message-content
      v-show="promptForm.content"
      :message="{role: Role.User, content: promptForm.content}"
    />
  </a-space>
  <div
    class="chat-display"
    style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center"
    v-show="localMessages.length === 0 && !systemDefine"
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
  overflow-y: auto;
  padding: 0 20px;
  box-sizing: border-box;
}
</style>
