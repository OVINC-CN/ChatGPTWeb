<script setup>
import {computed, ref, watch} from 'vue';
import {createChatAPI} from '../api/chat';
import {Message} from '@arco-design/web-vue';
import {Role} from '../constants';
import {useStore} from 'vuex';
import {useI18n} from 'vue-i18n';

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

const i18n = useI18n();

const promptForm = ref({
  content: '',
});

const store = useStore();
const model = computed(() => store.state.currentModel);
const modelName = ref('');
const allModels = computed(() => store.state.models);
const localModelKey = ref('local-model');
watch(() => allModels.value, () => {
  if (!allModels.value.length) {
    return;
  }
  const value = localStorage.getItem(localModelKey.value);
  let matched = false;
  allModels.value.forEach((item) => {
    if (item.id === value) {
      store.commit('setCurrentModel', value);
      modelName.value = item.name;
      matched = true;
    }
  });
  if (matched) {
    return;
  }
  store.commit('setCurrentModel', allModels.value[0].id);
  modelName.value = allModels.value[0].name;
}, {deep: true, immediate: true});
watch(() => model.value, () => {
  if (!allModels.value.length) {
    return;
  }
  let matched = false;
  allModels.value.forEach((item) => {
    if (item.id === model.value) {
      modelName.value = item.name;
      matched = true;
    }
  });
  if (matched) {
    return;
  }
  modelName.value = model.value;
});


const doChat = () => {
  // set loading
  emits('setChatLoading', true);
  // push message
  emits('addMessage', {role: 'user', content: promptForm.value.content});
  // call api
  createChatAPI({
    messages: [...props.localMessages, {role: 'user', content: promptForm.value.content}],
    model: model.value,
  })
      .then((res) => {
      // check success
        if (!res.ok) {
          Message.error(res.statusText);
          return;
        }
        // init response content
        const lastResponseContent = ref({role: Role.Assistant, content: ''});
        emits('addMessage', lastResponseContent.value);
        // clear input
        promptForm.value.content = '';
        // decode chunk
        const decoder = new TextDecoder('utf-8');
        const reader = res.body.getReader();
        // eslint-disable-next-line require-jsdoc
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
          :placeholder="model ? ($t('CurrentModel') + ': ' + modelName) : $t('NoModelChoosed')"
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
          :disabled="promptForm.content.length <= 0 || !model"
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
