<script setup>
import {computed, ref, watch} from 'vue';
import {createChatAPI, preCheckAPI} from '../api/chat';
import {Message} from '@arco-design/web-vue';
import {Role} from '../constants';
import {useStore} from 'vuex';
import {useI18n} from 'vue-i18n';

// props
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

// emits
const emits = defineEmits(['addMessage', 'setChatLoading', 'saveMessage', 'clearMessages', 'toggleUserBehavior', 'replaceMessages', 'setPromptForm']);

// i18n
const i18n = useI18n();

// user input
const promptForm = ref({
  content: '',
});

// store
const store = useStore();

// model
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

// chat
const doChat = async () => {
  // set loading
  emits('setChatLoading', true);
  // params
  const params = {
    messages: [...props.localMessages, {role: 'user', content: promptForm.value.content}],
    model: model.value,
  };
  // call api
  let key = '';
  await preCheckAPI(params)
      .then((preRes) => {
        key = preRes.data.key;
      }, (err) => {
        Message.error(err.response.data.message);
        emits('setChatLoading', false);
      });
  if (!key) {
    return;
  }
  createChatAPI({key})
      .then((res) => {
        // check success
        if (!res.ok) {
          emits('setChatLoading', false);
          Message.error(res.statusText);
          return;
        }
        // push message
        emits('addMessage', {role: 'user', content: promptForm.value.content});
        // auto scroll
        emits('toggleUserBehavior', false);
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
            if (chunk.done) {
              emits('setChatLoading', false);
            }
            emits('saveMessage');
          });
        }
        read();
      }, () => emits('setChatLoading', false));
};

const reGenerate = () => {
  if (!props.localMessages.length) {
    return;
  }
  emits('setChatLoading', true);
  emits('replaceMessages', props.localMessages.slice(0, props.localMessages.length - 2));
  promptForm.value.content = props.localMessages[props.localMessages.length -2].content;
  doChat();
};

//  auto submit
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

const showEditBox = ref(true);

defineExpose({reGenerate, promptForm});
</script>

<template>
  <div
    id="chat-input"
    :style="{height: showEditBox ? '214px' : '32px'}"
  >
    <a-form
      :model="promptForm"
      @submit="doChat"
    >
      <a-form-item
        field="content"
        hide-label
        v-show="showEditBox"
      >
        <a-textarea
          v-model="promptForm.content"
          :placeholder="model ? ($t('CurrentModel') + ': ' + modelName) : $t('NoModelChoosed')"
          :auto-size="{minRows: 6, maxRows: 6}"
          :disabled="chatLoading"
          @keydown="onKeydown"
          @input="emits('toggleUserBehavior', false); emits('setPromptForm', promptForm)"
          @focus="emits('toggleUserBehavior', false)"
        />
      </a-form-item>
      <a-form-item
        hide-label
        style="margin-bottom: 0;"
        id="chat-input-submit-button"
      >
        <a-space style="display: flex; width: 100%; justify-content: space-between;">
          <a-space>
            <a-button
              shape="circle"
              @click="showEditBox = !showEditBox"
            >
              <icon-layers />
            </a-button>
          </a-space>
          <a-space>
            <a-button
              :loading="chatLoading"
              @click="emits('clearMessages')"
              v-show="showEditBox"
            >
              {{ $t('ClearMessage') }}
            </a-button>
            <a-button
              type="primary"
              html-type="submit"
              :loading="chatLoading"
              :disabled="promptForm.content.length <= 0 || !model"
              v-show="showEditBox"
            >
              {{ $t('SendMessage') }}
            </a-button>
          </a-space>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
#chat-input {
  min-width: 100%;
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
