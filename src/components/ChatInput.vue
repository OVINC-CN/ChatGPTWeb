<script setup>
import {computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch} from 'vue';
import {preCheckAPI} from '@/api/chat';
import {Message} from '@arco-design/web-vue';
import {Role} from '@/constants';
import {useStore} from 'vuex';
import {useI18n} from 'vue-i18n';
import globalContext from '../context';
import {checkTCaptcha} from '@/utils/tcaptcha';
import {extractFileAPI, extractFileStatusAPI, getCOSConfigAPI, getCOSUploadTempKeyAPI} from '@/api/cos';
import {loadCOSClient} from '@/utils/cos';
import {IconFile, IconDelete} from '@arco-design/web-vue/es/icon';
import {listSystemPresetAPI} from '@/api/model';
import {listToolsAPI} from '@/api/tool';

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
  systemDefine: {
    type: String,
    default: '',
  },
});

// emits
const emits = defineEmits(['addMessage', 'setChatLoading', 'saveMessage', 'clearMessages', 'toggleUserBehavior', 'replaceMessages', 'setPromptForm', 'setSystemDefine']);

// i18n
const i18n = useI18n();

// user input
const promptForm = ref({
  content: '',
  file: '',
});

// store
const store = useStore();
const walletConfig = computed(() => store.state.walletConfig);

// model
const currentModel = ref('');
const model = ref({});
const previewModelData = computed(() => {
  return [
    {
      label: i18n.t('PromptUnitPrice'),
      value: model.value.prompt_price ? `${model.value.prompt_price}${walletConfig.value.unit}` : '',
      span: 1,
    },
    {
      label: i18n.t('CompletionUnitPrice'),
      value: model.value.completion_price ? `${model.value.completion_price}${walletConfig.value.unit}` : '',
      span: 1,
    },
  ];
});
const allModels = computed(() => store.state.models);
const localModelKey = ref('local-model');
watch(() => allModels.value, () => {
  if (!allModels.value.length) {
    return;
  }
  const value = localStorage.getItem(localModelKey.value);
  let isMatched = false;
  allModels.value.forEach((item) => {
    if (item.id === value) {
      currentModel.value = item.id;
      model.value = item;
      changeModel();
      isMatched = true;
    }
  });
  if (isMatched) {
    return;
  }
  currentModel.value = allModels.value[0].id;
  model.value = allModels.value[0];
  changeModel();
}, {deep: true, immediate: true});
const modelSelectVisible = ref(false);
const showModelSelect = () => {
  modelSelectVisible.value = true;
};
const hideSelectModel = () => {
  modelSelectVisible.value = false;
};
const changeModel = () => {
  if (!currentModel.value) {
    return;
  }
  localStorage.setItem(localModelKey.value, currentModel.value);
  hideSelectModel();
};
const previewModel = () => {
  if (!currentModel.value) {
    return;
  }
  allModels.value.forEach((item) => {
    if (item.id === currentModel.value) {
      model.value = item;
    }
  });
};

// chat
const lastResponseContent = ref(null);
const doChat = async () => {
  // set loading
  emits('setChatLoading', true);
  // params
  const params = {
    messages: [...props.localMessages, {role: 'user', content: promptForm.value.content, file: promptForm.value.file}],
    model: currentModel.value,
  };
  // max message length control
  params.messages = params.messages.slice(-(maxMessage.value + 1));
  // system define
  if (props.systemDefine) {
    params.messages.unshift({role: 'system', content: props.systemDefine});
  }
  // use tool
  if (currentTool.value) {
    params['tools'] = [currentTool.value];
  }
  // call api
  let key = '';
  await preCheckAPI(params)
      .then((preRes) => {
        key = preRes.data.key;
      }, (err) => {
        emits('setChatLoading', false);
        Message.error(err.response.data.message);
        if (err.response.status === 403) {
          store.commit('setUserInfoVisible', true);
        }
      });
  if (!key) {
    return;
  }
  // add message to display
  emits('addMessage', {role: 'user', content: promptForm.value.content, file: promptForm.value.file});
  // auto scroll
  emits('toggleUserBehavior', false);
  // init response content
  lastResponseContent.value = {role: Role.Assistant, content: ''};
  emits('addMessage', lastResponseContent.value);
  // clear input
  promptForm.value.content = '';
  promptForm.value.file = null;
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
const initWebSocket = () => {
  if (webSocket.value && webSocket.value.readyState === WebSocket.OPEN) {
    return new Promise((resolve) => resolve());
  }
  webSocket.value = new WebSocket(`${globalContext.webSocketUrl}/chat/`);
  webSocket.value.onmessage = (e) => {
    onMessage(e);
  };
  webSocket.value.onclose = () => {
    emits('setChatLoading', false);
  };
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
  promptForm.value.file = props.localMessages[props.localMessages.length -2].file;
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

// preset
const presetVisible = ref(false);
const changePreset = () => presetVisible.value = true;
const setSystemDefine = (define) => emits('setSystemDefine', define);
const systemPresets = ref([]);
const loadSystemPresets = () => {
  listSystemPresetAPI().then(
      (res) => systemPresets.value = res.data,
  );
};
onMounted(() => loadSystemPresets());
const customSystemDefine = ref('');
watch(() => props.systemDefine, () => customSystemDefine.value = props.systemDefine);
const doSubmitPreset = () => {
  presetVisible.value = false;
  setSystemDefine(customSystemDefine.value);
};
const resetSubmitPreset = () => {
  customSystemDefine.value = '';
  doSubmitPreset();
};
const doSelectSystemPreset = (id) => {
  systemPresets.value.forEach((item) => {
    if (item.id === id) {
      customSystemDefine.value = item.content;
    }
  });
};
const chosenPreset = ref('');
watch(() => presetVisible.value, () => {
  if (!presetVisible.value) {
    presetVisible.value = false;
    chosenPreset.value = '';
  }
});

// message length
const maxMessageVisible = ref(false);
const messageLength = ref([0, 32]);
const maxMessage = ref(10);
watch(() => maxMessage.value, () => {
  if (maxMessage.value % 2 !== 0) {
    maxMessage.value++;
  }
  localStorage.setItem(localMaxMessageKey.value, JSON.stringify(maxMessage.value));
});
const showMaxMessage = () => maxMessageVisible.value = true;
const localMaxMessageKey = ref('local-max-message');
onMounted(() => {
  const value = localStorage.getItem(localMaxMessageKey.value);
  if (value) {
    try {
      maxMessage.value = JSON.parse(value);
    } catch (_) {}
  }
});

// tools
const tools = ref([]);
const loadTools = () => {
  listToolsAPI().then((res) => tools.value = res.data);
};
onMounted(() => loadTools());
const currentTool = ref('');
const currentToolDesc = computed(() => {
  let val = '';
  tools.value.forEach((item) => {
    if (item.id === currentTool.value) {
      val = item.desc;
    }
  });
  return val ? val : '';
});
const toolVisible = ref(false);
const changeTool = () => toolVisible.value = true;
const doSubmitTool = () => {
  toolVisible.value = false;
  localStorage.setItem(localToolKey.value, JSON.stringify(currentTool.value));
};
const resetTool = () => {
  toolVisible.value = false;
  currentTool.value = '';
  currentToolDesc.value = '';
  doSubmitTool();
};
const localToolKey = ref('local-tool');
onMounted(() => {
  const value = localStorage.getItem(localToolKey.value);
  if (value) {
    try {
      currentTool.value = JSON.parse(value);
    } catch (_) {}
  }
});

// upload file
const uploadEnabled = ref(false);
onMounted(() => getCOSConfigAPI().then((res) => uploadEnabled.value = res.data.upload_file_enabled));
const fileUploadInput = ref(null);
const customUpload = () => {
  if (promptForm.value.file) {
    promptForm.value.file = null;
    return;
  }
  fileUploadInput.value.click();
};
const handleFileChange = (event) => {
  const file = event.target.files[0];
  fileUploadInput.value.value = null;
  doUploadFile(file);
};
const doUploadFile = (file) => {
  emits('setChatLoading', true);
  checkTCaptcha((ret) => {
    getCOSUploadTempKeyAPI(file.name, 'file-extract', ret).then(
        (res) => {
          const credentials = res.data;
          const cos = loadCOSClient(credentials);
          cos.putObject(
              {
                Bucket: credentials.cos_bucket,
                Region: credentials.cos_region,
                Key: credentials.key,
                Body: file,
              },
              (err) => {
                if (err) {
                  emits('setChatLoading', false);
                  Message.error(err.message);
                } else {
                  const filePath = `${credentials.cos_url}${credentials.key}`;
                  extractFileAPI(filePath).then(
                      () => {
                        checkExtractStatus(filePath);
                      },
                      (err) => {
                        emits('setChatLoading', false);
                        Message.error(err.response.data.message);
                      },
                  );
                }
              });
        },
        (err) => {
          emits('setChatLoading', false);
          Message.error(err.response.data.message);
        },
    );
  });
};
const checkExtractStatus = (filePath) => {
  setTimeout(() => {
    extractFileStatusAPI(filePath).then(
        (res) => {
          if (res.data.is_finished) {
            if (res.data.is_success) {
              promptForm.value.file = filePath;
            } else {
              Message.error(i18n.t('ExtractFileFailed'));
            }
            emits('setChatLoading', false);
          } else {
            checkExtractStatus(filePath);
          }
        },
        (err) => {
          emits('setChatLoading', false);
          Message.error(err.response.data.message);
        },
    );
  }, 2000);
};

// paste
const enabledPasteToUpload = ref(true);
const handlePaste = (e) => {
  if (!enabledPasteToUpload.value) {
    return;
  }
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file.type.indexOf('image/') !== -1 || file.type.indexOf('application/') !== -1 || file.type.indexOf('text/') !== -1 ) {
        doUploadFile(file);
      }
    }
  }
};
onMounted(() => window.addEventListener('paste', handlePaste));
onUnmounted(() => window.removeEventListener('paste', handlePaste));

// drag
const enableDragToUpload = ref(true);
const handleDragOver = (e) => {
  if (!enableDragToUpload.value) {
    return;
  }
  e.preventDefault();
};
const handleDragEnter = (e) => {
  if (!enableDragToUpload.value) {
    return;
  }
  e.preventDefault();
};
const handleDragLeave = (e) => {
  if (!enableDragToUpload.value) {
    return;
  }
  e.preventDefault();
};
const handleDrop = (e) => {
  if (!enableDragToUpload.value) {
    return;
  }
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    console.log(file.type);
    if (file.type.indexOf('image/') !== -1 || file.type.indexOf('application/') !== -1 || file.type.indexOf('text/') !== -1 ) {
      doUploadFile(file);
    }
  }
};
onMounted(() => {
  const textInputEl = document.getElementById('chat-input-textarea');
  textInputEl.addEventListener('dragover', handleDragOver);
  textInputEl.addEventListener('drop', handleDrop);
  textInputEl.addEventListener('dragenter', handleDragEnter);
  textInputEl.addEventListener('dragleave', handleDragLeave);
});
onUnmounted(() => {
  const textInputEl = document.getElementById('chat-input-textarea');
  textInputEl.removeEventListener('dragover', handleDragOver);
  textInputEl.removeEventListener('drop', handleDrop);
  textInputEl.removeEventListener('dragenter', handleDragEnter);
  textInputEl.removeEventListener('dragleave', handleDragLeave);
});

defineExpose({reGenerate, promptForm});
</script>

<template>
  <div id="chat-input">
    <input
      ref="fileUploadInput"
      style="display: none"
      type="file"
      accept="image/*, application/*, text/*"
      @change="handleFileChange"
    >
    <a-form
      :model="promptForm"
      @submit="doChat"
    >
      <a-form-item
        hide-label
        id="chat-input-submit-button"
      >
        <a-space style="display: flex; width: 100%; justify-content: space-between;">
          <a-space>
            <a-button
              v-if="userBehavior && chatLoading"
              @click="emits('toggleUserBehavior', false)"
              @touchstart="emits('toggleUserBehavior', false)"
              class="chat-input-left-button"
            >
              <icon-arrow-down />
            </a-button>
            <a-button
              :disabled="chatLoading"
              class="chat-input-left-button"
              @click="showModelSelect"
            >
              <icon-robot />
            </a-button>
            <a-button
              v-if="showEditBox"
              :disabled="chatLoading"
              @click="changePreset"
              class="chat-input-left-button"
              :type="props.systemDefine ? 'primary': undefined"
              :status="props.systemDefine ? 'warning' : undefined"
            >
              <icon-bulb />
            </a-button>
            <a-button
              v-if="showEditBox && (tools.length > 0 || currentTool)"
              :disabled="chatLoading"
              @click="changeTool"
              class="chat-input-left-button"
              :type="currentTool ? 'primary': undefined"
              :status="currentTool ? 'warning' : undefined"
            >
              <icon-apps />
            </a-button>
            <a-button
              v-if="uploadEnabled && showEditBox"
              :disabled="chatLoading"
              @click="customUpload"
              :type="promptForm.file ? 'primary': undefined"
              :status="promptForm.file ? 'warning' : undefined"
              class="chat-input-left-button"
            >
              <icon-file />
            </a-button>
          </a-space>
          <a-space>
            <a-button
              v-if="showEditBox"
              :disabled="chatLoading"
              @click="emits('clearMessages')"
              class="chat-input-left-button"
            >
              <icon-delete />
            </a-button>
            <a-button
              v-if="showEditBox"
              :disabled="chatLoading"
              @click="showMaxMessage"
              class="chat-input-left-button"
            >
              <a-space :size="2">
                <icon-history />
                <span>
                  {{ maxMessage }}
                </span>
              </a-space>
            </a-button>
            <a-button
              v-if="showEditBox"
              type="primary"
              html-type="submit"
              :disabled="promptForm.content.length <= 0 || !currentModel || chatLoading"
            >
              <icon-send />
            </a-button>
          </a-space>
        </a-space>
      </a-form-item>
      <a-form-item
        field="content"
        hide-label
        style="margin-bottom: 0;"
        v-show="showEditBox"
      >
        <a-spin
          dot
          style="width: 100%"
          :loading="chatLoading"
        >
          <a-textarea
            id="chat-input-textarea"
            v-model="promptForm.content"
            :placeholder="model.id ? ($t('CurrentModel') + ': ' + model.name + '\n' + (model.desc ? model.desc : '')) : $t('NoModelChoosed')"
            :auto-size="{minRows: 3, maxRows: 10}"
            :disabled="chatLoading"
            @keydown="onKeydown"
            @input="emits('toggleUserBehavior', false); emits('setPromptForm', promptForm)"
            @focus="emits('toggleUserBehavior', false)"
          />
        </a-spin>
      </a-form-item>
    </a-form>
    <a-modal
      v-model:visible="toolVisible"
      :footer="false"
      :esc-to-close="true"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('Tools') }}
        </div>
      </template>
      <a-space
        direction="vertical"
        id="chat-input-tool-choose"
      >
        <a-select
          :placeholder="$t('PleaseChooseTool')"
          v-model="currentTool"
        >
          <a-option
            v-for="item in tools"
            :key="item.id"
            :value="item.id"
            :label="item.name"
          />
        </a-select>
        <a-textarea
          v-model="currentToolDesc"
          :auto-size="{minRows: 3, maxRows: 10}"
          :placeholder="$t('PleaseChooseTool')"
        />
        <div class="model-tool-tips">
          {{ $t('ToolUseTips') }}
        </div>
        <a-space style="width: 100%; display: flex; justify-content: flex-end">
          <a-button
            v-if="currentTool"
            type="primary"
            status="warning"
            @click="resetTool"
          >
            {{ $t('Remove') }}
          </a-button>
          <a-button
            type="primary"
            @click="doSubmitTool"
          >
            {{ $t('Save') }}
          </a-button>
        </a-space>
      </a-space>
    </a-modal>
    <a-modal
      v-model:visible="maxMessageVisible"
      :footer="false"
      :esc-to-close="true"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('MaxMessagesCount') }}
        </div>
      </template>
      <a-space
        direction="vertical"
      >
        <a-input-number
          v-model="maxMessage"
          :mode="'button'"
          :style="{ width: '100%' }"
          :step="2"
          :min="messageLength[0]"
          :max="messageLength[1]"
        />
        <a-slider
          v-model:model-value="maxMessage"
          :style="{ width: '100%' }"
          :step="2"
          :min="messageLength[0]"
          :max="messageLength[1]"
        />
        <div class="model-context-tips">
          {{ $t('ModelContextLengthTips') }}
        </div>
      </a-space>
    </a-modal>
    <a-modal
      v-model:visible="presetVisible"
      :footer="false"
      :esc-to-close="true"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('SystemDefine') }}
        </div>
      </template>
      <a-space
        id="chat-input-system-define-content"
        direction="vertical"
      >
        <a-select
          v-if="systemPresets.length > 0"
          id="chat-input-system-define-content-tag"
          @change="doSelectSystemPreset"
          :placeholder="$t('PleaseChoosePreset')"
          v-model="chosenPreset"
        >
          <a-option
            v-for="item in systemPresets"
            :key="item.id"
            :value="item.id"
            :label="item.name"
          />
        </a-select>
        <a-textarea
          v-model="customSystemDefine"
          :auto-size="{minRows: 3, maxRows: 10}"
          :placeholder="$t('SystemDefine')"
        />
        <div class="model-ignore-system-tips">
          {{ $t('ModelIgnoreSystemDefineTips') }}
        </div>
        <a-space style="width: 100%; display: flex; justify-content: flex-end">
          <a-button
            v-if="customSystemDefine"
            type="primary"
            status="warning"
            @click="resetSubmitPreset"
          >
            {{ $t('Remove') }}
          </a-button>
          <a-button
            type="primary"
            @click="doSubmitPreset"
          >
            {{ $t('Save') }}
          </a-button>
        </a-space>
      </a-space>
    </a-modal>
    <a-modal
      v-model:visible="modelSelectVisible"
      :footer="false"
      :esc-to-close="true"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('Model') }}
        </div>
      </template>
      <a-space
        direction="vertical"
        style="width: 100%;"
      >
        <a-select
          v-if="allModels.length > 0"
          @change="previewModel"
          :placeholder="$t('PleaseChooseModel')"
          v-model="currentModel"
        >
          <a-option
            v-for="item in allModels"
            :key="item.id"
            :value="item.id"
            :label="item.name"
          />
        </a-select>
        <a-descriptions
          layout="inline-vertical"
          bordered
          :data="previewModelData"
          :column="2"
        >
          <template
            v-for="item in previewModelData"
            :key="item.name"
          >
            <a-descriptions-item
              :label="item.label"
              :span="item.span"
            >
              <span v-if="typeof item.value === 'number'">{{ item.value ? item.value.toFixed(4) : '- -' }}</span>
              <span v-else>{{ item.value ? item.value : '- -' }}</span>
            </a-descriptions-item>
          </template>
        </a-descriptions>
        <div class="model-price-tips">
          {{ $t('PriceUnitTips') }}
        </div>
        <a-space style="width: 100%; display: flex; justify-content: flex-end">
          <a-button
            type="primary"
            @click="changeModel"
          >
            {{ $t('Save') }}
          </a-button>
        </a-space>
      </a-space>
    </a-modal>
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

.chat-input-left-button {
  padding: 6px;
}

#chat-input-system-define-content,
#chat-input-system-define-content > :deep(.arco-space-item) {
  width: 100%;
}

#chat-input-system-define-content-tag {
  width: 100%;
}

.model-ignore-system-tips,
.model-context-tips,
.model-tool-tips,
.model-price-tips {
  color: var(--color-neutral-6);
  font-size: 12px;
}

#chat-input-tool-choose,
#chat-input-system-define-content > :deep(.arco-space-item) {
  width: 100%;
}
</style>
