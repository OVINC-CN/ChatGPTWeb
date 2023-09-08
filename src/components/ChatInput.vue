<script setup>
import { onMounted, ref } from 'vue';
import { createChatAPI } from '../api/chat';
import { Message } from '@arco-design/web-vue';
import { Role } from '../constants';

const props = defineProps({
  localMessages: {
    type: Array,
    default: () => ([]),
  },
  chatLoading: {
    type: Boolean,
    default: false,
  },
});

const emits = defineEmits(['addMessage', 'setChatLoading', 'saveMessage', 'clearMessages']);

const promptForm = ref({
  model: 'gpt-3.5-turbo',
  content: '',
});

const localModelKey = ref('local-model');
onMounted(() => {
  const value = localStorage.getItem(localModelKey.value);
  if (value) {
    promptForm.value.model = value;
  }
});

const doChat = () => {
  // set loading
  emits('setChatLoading', true);
  emits('addMessage', { role: 'user', content: promptForm.value.content });
  // call api
  createChatAPI({
    messages: [...props.localMessages, { role: 'user', content: promptForm.value.content }],
    model: promptForm.value.model,
  })
    .then((res) => {
      // check success
      if (!res.ok) {
        Message.error(res.statusText);
        return;
      }
      // init response content
      const lastResponseContent = ref({ role: Role.Assistant, content: '' });
      emits('addMessage', lastResponseContent.value);
      // clear input
      promptForm.value.content = '';
      // decode chunk
      const decoder = new TextDecoder('utf-8');
      const reader = res.body.getReader();
      function read() {
        reader.read().then((chunk) => {
          if (!chunk.done) {
            const value = decoder.decode(chunk.value);
            lastResponseContent.value.content += value;
            read();
          }
          emits('saveMessage');
        });
      }
      read();
    })
    .finally(() => emits('setChatLoading', false));
};

const lastMeta = ref(false);
const allowSubmitKeys = ref(['Shift', 'Alt', 'Control', 'Meta']);
const onKeydown = (event) => {
  if (allowSubmitKeys.value.indexOf(event.key) !== -1) {
    lastMeta.value = true;
    return;
  }
  if (lastMeta.value && event.key === 'Enter') {
    doChat();
  }
  lastMeta.value = false;
};
</script>

<template>
  <div id="chat-input">
    <a-form
      :model="promptForm"
      @submit="doChat"
    >
      <a-form-item
        field="content"
        hide-label
      >
        <a-textarea
          v-model="promptForm.content"
          :placeholder="$t('PleaseInput')"
          :auto-size="{minRows: 6, maxRows: 6}"
          :disabled="chatLoading"
          @keydown="onKeydown"
        />
      </a-form-item>
      <a-form-item
        hide-label
        style="margin-bottom: 0;"
        id="chat-input-submit-button"
      >
        <a-button
          :loading="chatLoading"
          style="margin-right: 10px"
          @click="emits('clearMessages')"
        >
          {{ $t('ClearMessage') }}
        </a-button>
        <a-button
          type="primary"
          html-type="submit"
          :loading="chatLoading"
          :disabled="promptForm.content.length <= 0"
        >
          {{ $t('SendMessage') }}
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
#chat-input {
  min-width: 100%;
  height: 214px;
  padding: 0 20px;
  box-sizing: border-box;
}

#chat-input-submit-button :deep(.arco-form-item-content-flex) {
  justify-content: flex-end;
}

#chat-input :deep(.arco-textarea-wrapper) {
  background: var(--color-fill-1);
}

#chat-input :deep(.arco-textarea-wrapper:hover) {
  background: var(--color-fill-2);
}
</style>
