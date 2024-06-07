<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue';
import {preCheckAPI} from '../api/chat';
import {Message} from '@arco-design/web-vue';
import {Role} from '../constants';
import {useStore} from 'vuex';
import {useI18n} from 'vue-i18n';
import globalContext from '../context';

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
  userBehavior: {
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
const lastResponseContent = ref(null);
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
  // add message to display
  emits('addMessage', {role: 'user', content: promptForm.value.content});
  // auto scroll
  emits('toggleUserBehavior', false);
  // init response content
  lastResponseContent.value = {role: Role.Assistant, content: ''};
  emits('addMessage', lastResponseContent.value);
  // clear input
  promptForm.value.content = '';
  // send message
  sendMessage(JSON.stringify({key}), true);
};
const onMessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.is_finished) {
    emits('setChatLoading', false);
  }
  if (data.data) {
    lastResponseContent.value.content += data.data;
    emits('saveMessage');
  }
};
const sendMessage = (message) => {
  initWebSocket().then(
      () => {
        webSocket.value.send(message);
      },
      () => {
        Message.error(i18n.t('ConnectionClosedPleaseRetry'));
      },
  );
};

// webSocket
const webSocket = ref(null);
const retryTimes = ref(0);
const maxRetryTimes = ref(1000);
const buildWebSocketPromise = () => {
  return new Promise((resolve, reject) => {
    webSocket.value.onopen = (e) => {
      resolve(e);
    };
    webSocket.value.onerror = (e) => {
      emits('setChatLoading', false);
      reject(e);
    };
  });
};
const initWebSocket = () => {
  if (webSocket.value && webSocket.value.readyState === WebSocket.OPEN) {
    return buildWebSocketPromise();
  }
  webSocket.value = new WebSocket(`${globalContext.webSocketUrl}/chat/`);
  webSocket.value.onmessage = (e) => {
    onMessage(e);
  };
  webSocket.value.onclose = () => {
    emits('setChatLoading', false);
  };
  return buildWebSocketPromise();
};
const closeWebSocket = () => {
  if (webSocket.value && webSocket.value.readyState === WebSocket.OPEN) {
    webSocket.value.close();
  }
};
onBeforeUnmount(() => closeWebSocket());

const reGenerate = () => {
  if (!props.localMessages.length) {
    return;
  }
  const willingLength = props.localMessages.slice(0, props.localMessages.length - 2).length;
  emits('setChatLoading', true);
  emits('replaceMessages', props.localMessages.slice(0, props.localMessages.length - 2));
  promptForm.value.content = props.localMessages[props.localMessages.length -2].content;
  checkForRegenerate(willingLength);
};
const checkForRegenerate = (willingLength) => {
  setTimeout(() => {
    if (props.localMessages.length === willingLength) {
      doChat();
    } else {
      checkForRegenerate();
    }
  }, 500 );
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
            <a-button
              shape="circle"
              @click="emits('toggleUserBehavior', false)"
              v-show="userBehavior"
            >
              <icon-arrow-down />
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
