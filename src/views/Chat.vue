<script setup>
import {onMounted, ref} from 'vue';
import ChatInput from '../components/ChatInput.vue';
import {handleLoading} from '../utils/loading';
import MessageDisplay from '../components/MessageDisplay.vue';

const localMessages = ref([]);
const localMessageKey = ref('local-message');
const addMessage = (message) => {
  localMessages.value.push(message);
};
const replaceMessages = (messages) => {
  localMessages.value = messages;
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
const setChatLoading = (status) => handleLoading(chatLoading, status);

// scroll
const userBehavior = ref(false);
const toggleUserBehavior = (status) => userBehavior.value = status;

// reGenerate
const chatInputRef = ref();
const reGenerate = () => {
  chatInputRef.value.reGenerate();
};
const promptForm = ref({});
const setPromptForm = (data) => promptForm.value = data;
</script>

<template>
  <div id="chat">
    <div id="chat-content">
      <message-display
        :local-messages="localMessages"
        :user-behavior="userBehavior"
        :prompt-form="promptForm"
        @toggle-user-behavior="toggleUserBehavior"
        @re-generate="reGenerate"
      />
      <a-divider />
      <chat-input
        ref="chatInputRef"
        :user-behavior="userBehavior"
        :local-messages="localMessages"
        :chat-loading="chatLoading"
        @add-message="addMessage"
        @set-chat-loading="setChatLoading"
        @save-message="saveMessage"
        @clear-messages="clearMessages"
        @toggle-user-behavior="toggleUserBehavior"
        @replace-messages="replaceMessages"
        @set-prompt-form="setPromptForm"
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
