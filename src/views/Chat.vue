<script setup>
import { onMounted, ref } from 'vue';
import ChatInput from '../components/ChatInput.vue';
import { handleLoading } from '../utils/loading';
import MessageDisplay from '../components/MessageDisplay.vue';

const localMessages = ref([]);
const localMessageKey = ref('local-message');
const addMessage = (message) => {
  localMessages.value.push(message);
};
const saveMessage = () => localStorage.setItem(localMessageKey.value, JSON.stringify(localMessages.value));
const clearMessages = () => {
  localMessages.value = [];
  saveMessage();
};
onMounted(() => {
  const value = localStorage.getItem(localMessageKey.value);
  if (value) {
    localMessages.value = JSON.parse(value);
  } else {
    localMessages.value = [];
  }
});

const chatLoading = ref(false);
const setChatLoading = status => handleLoading(chatLoading, status);
</script>

<template>
  <div id="chat">
    <div id="chat-content">
      <message-display :local-messages="localMessages" />
      <a-divider />
      <chat-input
        :local-messages="localMessages"
        :chat-loading="chatLoading"
        @add-message="addMessage"
        @set-chat-loading="setChatLoading"
        @save-message="saveMessage"
        @clear-messages="clearMessages"
      />
    </div>
  </div>
</template>

<style scoped>
#chat {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 100%;
}

#chat-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 160px);
}
</style>
