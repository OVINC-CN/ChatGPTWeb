<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
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

// model
const model = computed(() => store.state.currentModel);
const modelName = ref('');
const modelDesc = ref('');
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
      modelDesc.value = item.desc;
      matched = true;
    }
  });
  if (matched) {
    return;
  }
  store.commit('setCurrentModel', allModels.value[0].id);
  modelName.value = allModels.value[0].name;
  modelDesc.value = allModels.value[0].desc;
}, {deep: true, immediate: true});
watch(() => model.value, () => {
  if (!allModels.value.length) {
    return;
  }
  let matched = false;
  allModels.value.forEach((item) => {
    if (item.id === model.value) {
      modelName.value = item.name;
      modelDesc.value = item.desc;
      matched = true;
    }
  });
  if (matched) {
    return;
  }
  modelName.value = model.value;
  modelDesc.value = model.value.desc;
});

// chat
const lastResponseContent = ref(null);
const doChat = async () => {
  // set loading
  emits('setChatLoading', true);
  // params
  const params = {
    messages: [...props.localMessages, {role: 'user', content: promptForm.value.content, file: promptForm.value.file}],
    model: model.value,
  };
  // system define
  if (props.systemDefine) {
    params.messages.unshift({role: 'system', content: props.systemDefine});
  }
  // call api
  let key = '';
  await preCheckAPI(params)
      .then((preRes) => {
        key = preRes.data.key;
      }, (err) => {
        emits('setChatLoading', false);
        Message.error(err.response.data.message);
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

// models
const models = computed(() => store.state.models);
const setModel = (model) => {
  localStorage.setItem(localModelKey.value, model);
  store.commit('setCurrentModel', model);
};

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
const customSystemDefine = ref('');
watch(() => props.systemDefine, () => customSystemDefine.value = props.systemDefine);
onMounted(() => loadSystemPresets());
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

defineExpose({reGenerate, promptForm});
</script>

<template>
  <div id="chat-input">
    <input
      ref="fileUploadInput"
      style="display: none"
      type="file"
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
            <a-tooltip
              v-if="userBehavior && chatLoading"
              :background-color="'var(--color-fill-1)'"
            >
              <template #content>
                <span style="color: var(--color-text-2)">
                  {{ $t('ToBottom') }}
                </span>
              </template>
              <a-button
                @click="emits('toggleUserBehavior', false)"
                class="chat-input-left-button"
              >
                <icon-arrow-down />
              </a-button>
            </a-tooltip>
            <a-dropdown @select="setModel">
              <a-button
                :disabled="chatLoading"
                class="chat-input-left-button"
              >
                <icon-robot />
              </a-button>
              <template #content>
                <a-doption
                  v-for="item in models"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </a-doption>
              </template>
            </a-dropdown>
            <a-tooltip
              :background-color="'var(--color-fill-1)'"
              v-if="showEditBox"
            >
              <template #content>
                <span style="color: var(--color-text-2)">
                  {{ $t('SystemDefine') }}
                </span>
              </template>
              <a-button
                :disabled="chatLoading"
                @click="changePreset"
                class="chat-input-left-button"
                :type="props.systemDefine ? 'primary': undefined"
                :status="props.systemDefine ? 'warning' : undefined"
              >
                <icon-bulb />
              </a-button>
            </a-tooltip>
            <a-tooltip
              :background-color="'var(--color-fill-1)'"
              v-if="uploadEnabled && showEditBox"
            >
              <template #content>
                <span style="color: var(--color-text-2)">
                  {{ promptForm.file ? $t('RemoveFile') : $t('UploadFile') }}
                </span>
              </template>
              <a-button
                :disabled="chatLoading"
                @click="customUpload"
                :type="promptForm.file ? 'primary': undefined"
                :status="promptForm.file ? 'warning' : undefined"
                class="chat-input-left-button"
              >
                <icon-file />
              </a-button>
            </a-tooltip>
            <a-tooltip
              :background-color="'var(--color-fill-1)'"
              v-if="showEditBox"
            >
              <template #content>
                <span style="color: var(--color-text-2)">
                  {{ $t('ClearMessage') }}
                </span>
              </template>
              <a-button
                :disabled="chatLoading"
                @click="emits('clearMessages')"
                class="chat-input-left-button"
              >
                <icon-delete />
              </a-button>
            </a-tooltip>
          </a-space>
          <a-space>
            <a-tooltip
              :background-color="'var(--color-fill-1)'"
              v-if="showEditBox"
            >
              <template #content>
                <span style="color: var(--color-text-2)">
                  {{ $t('SendMessage') }}
                </span>
              </template>
              <a-button
                type="primary"
                html-type="submit"
                :disabled="promptForm.content.length <= 0 || !model || chatLoading"
              >
                <icon-send />
              </a-button>
            </a-tooltip>
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
            v-model="promptForm.content"
            :placeholder="model ? ($t('CurrentModel') + ': ' + modelName + '\n' + (modelDesc ? modelDesc : '')) : $t('NoModelChoosed')"
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
      v-model:visible="presetVisible"
      :footer="false"
      @cancel="presetVisible = false"
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
          :allow-search="true"
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

.model-ignore-system-tips {
  color: var(--color-neutral-6);
  font-size: 12px;
}
</style>
