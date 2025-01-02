<script setup>
import {computed, onMounted, ref} from 'vue';
import ChatInput from '../components/ChatInput.vue';
import {handleLoading} from '@/utils/loading';
import MessageDisplay from '@/components/MessageDisplay.vue';
import moment from 'moment';
import {Role, SyncAction} from '@/constants';
import {getLocalStorageSize, setLocalStorage} from '@/utils/local_storage';
import {Encryption} from '@/utils/encrypt';
import {getChatHistoryAPI, updateChatHistoryAPI} from '@/api/chat';
import {Message} from '@arco-design/web-vue';
import {useI18n} from 'vue-i18n';

// i18n
const i18n = useI18n();

// message
const oldLocalMessageKey = 'local-message';
const localMessages = ref([]);
const currentMessageID = ref('');
const currentMessageKey = 'local-message-id';
const messageIDPrefix = 'local-message-';
const localMessageStore = ref({});
const localMessageStoreKey = 'local-message-store';
const sortedMessageStore = computed(() => {
  return Object.entries(localMessageStore.value)
      .sort(([, a], [, b]) => b.created_at - a.created_at)
      .reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {},
      );
});
const addMessage = (message) => {
  localMessages.value.push(message);
};
const replaceMessages = (messages) => {
  localMessages.value = messages;
};
const saveMessage = () => {
  setLocalStorage(currentMessageKey, JSON.stringify(currentMessageID.value));
  setLocalStorage(currentMessageID.value, JSON.stringify(localMessages.value));
  if (localMessageStore.value[currentMessageID.value] === undefined) {
    localMessageStore.value[currentMessageID.value] = {
      created_at: moment().unix(),
      title: extractQuestion(localMessages.value),
    };
    setLocalStorage(localMessageStoreKey, JSON.stringify(localMessageStore.value));
  } else if (!localMessageStore.value[currentMessageID.value]['title']) {
    localMessageStore.value[currentMessageID.value]['title'] = extractQuestion(localMessages.value);
    setLocalStorage(localMessageStoreKey, JSON.stringify(localMessageStore.value));
  }
};
const removeMessage = (messageKey, deleteRemote) => {
  localStorage.removeItem(messageKey);
  delete localMessageStore.value[messageKey];
  setLocalStorage(localMessageStoreKey, JSON.stringify(localMessageStore.value));
  if (currentMessageID.value === messageKey) {
    localMessages.value = [];
    localStorage.removeItem(currentMessageKey);
  }
  if (deleteRemote) {
    updateChatHistoryAPI({message_id: messageKey, action: SyncAction.Delete, content: ''});
  }
};
const newMessage = () => {
  currentMessageID.value = generateMessageID();
  localMessages.value = [];
  saveMessage();
};
const changeCurrentMessage = (messageID) => {
  historyVisible.value = false;
  currentMessageID.value = messageID;
  localMessages.value = JSON.parse(localStorage.getItem(currentMessageID.value));
  setLocalStorage(currentMessageKey, JSON.stringify(currentMessageID.value));
};
onMounted(() => {
  // parse old data
  const oldValue = localStorage.getItem(oldLocalMessageKey);
  if (oldValue) {
    const messageKey = generateMessageID();
    setLocalStorage(messageKey, oldValue);
    setLocalStorage(
        localMessageStoreKey,
        JSON.stringify({
          [messageKey]: {
            created_at: moment().unix(),
            title: extractQuestion(JSON.parse(oldValue)),
          },
        }),
    );
    localStorage.removeItem(oldLocalMessageKey);
  }
  // load new data
  const messageKeys = localStorage.getItem(localMessageStoreKey);
  if (messageKeys) {
    localMessageStore.value = JSON.parse(messageKeys);
  } else {
    localMessageStore.value = {};
  }
  // load message id
  const messageID = localStorage.getItem(currentMessageKey);
  if (messageID) {
    currentMessageID.value = JSON.parse(messageID);
  } else if (localMessageStore.value.length > 0) {
    currentMessageID.value = localMessageStore.value[0];
  } else {
    currentMessageID.value = generateMessageID();
  }
  // load message
  if (currentMessageID.value) {
    const messages = localStorage.getItem(currentMessageID.value);
    if (messages) {
      localMessages.value = JSON.parse(messages);
    } else {
      localMessages.value = [];
    }
  }
});

// history
const historyVisible = ref(false);
const showHistory = () => historyVisible.value = true;
const hideHistoryAndNewMessage = () => {
  historyVisible.value = false;
  newMessage();
};
const extractQuestion = (messages) => {
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role === Role.User) {
      return message.content;
    }
  }
  return '';
};
const generateMessageID = () => `${messageIDPrefix}${moment().unix()}`;
const localStorageSize = ref(0);
const onHistoryOpen = () => {
  localStorageSize.value = getLocalStorageSize();
};

// history sync
const historySync = ref(false);
const historySyncKey = 'local-sync';
const historySyncEncrypt = ref('');
const historySyncEncryptObj = ref(null);
const historySyncEncryptKey = 'local-sync-encrypt';
const historySyncStartTime = ref(null);
const historySyncStartTimeKey = 'local-sync-start-time';
const historySyncConfigVisible = ref(false);
const showHistorySyncConfig = () => {
  historySyncConfigVisible.value = true;
};
const enableHistorySync = () => {
  historySync.value = true;
  localStorage.setItem(historySyncKey, JSON.stringify(historySync.value));
  localStorage.setItem(historySyncEncryptKey, JSON.stringify(historySyncEncrypt.value));
  historySyncConfigVisible.value = false;
  historySyncEncryptObj.value = new Encryption(historySyncEncrypt.value);
  doHistorySync();
};
const disableHistorySync = () => {
  historySync.value = false;
  localStorage.setItem(historySyncKey, JSON.stringify(historySync.value));
  localStorage.setItem(historySyncEncryptKey, JSON.stringify(historySyncEncrypt.value));
  historySyncConfigVisible.value = false;
};
const doHistorySync = async () => {
  let syncFinished = true;
  const syncTime = moment().unix();
  const pageParams = {page: 1, size: 10};
  let total = -1;
  while (total < 0 || total > (pageParams.page - 1) * pageParams.size) {
    try {
      const res = await getChatHistoryAPI({
        start_time: historySyncStartTime.value,
        ...pageParams,
      });
      total = res.data.total;
      for (const item of res.data.results) {
        // update message
        if (item.action === SyncAction.Update) {
          const messages = historySyncEncryptObj.value.decrypt(item.content);
          if (currentMessageID.value === item.message_id) {
            if (!chatLoading.value) {
              localMessages.value = messages;
              localStorage.setItem(item.message_id, JSON.stringify(messages));
            }
          } else {
            const createdAt = item.message_id.split('-')[2];
            localMessageStore.value[item.message_id] = {'created_at': createdAt, 'title': messages[0].content};
            localStorage.setItem(localMessageStoreKey, JSON.stringify(localMessageStore.value));
            localStorage.setItem(item.message_id, JSON.stringify(messages));
          }
        }
        // delete message
        if (item.action === SyncAction.Delete) {
          removeMessage(item.message_id, false);
        }
      }
      pageParams.page++;
    } catch (err) {
      console.error(err);
      if (err.message.includes('Decryption failed')) {
        Message.error(i18n.t('DecryptMessageLogFailed'));
      }
      total = 0;
      syncFinished = false;
      break;
    }
  }
  if (syncFinished) {
    historySyncStartTime.value = syncTime;
    localStorage.setItem(
        historySyncStartTimeKey,
        JSON.stringify(historySyncStartTime.value),
    );
  }
  setTimeout(() => doHistorySync(), 1000 * 60 * 10);
};
onMounted(() => {
  // load sync status
  const syncEnabled = localStorage.getItem(historySyncKey);
  if (syncEnabled) {
    try {
      historySync.value = JSON.parse(syncEnabled);
    } catch (_) {}
  }
  // load sync encrypt
  const syncEncrypt = localStorage.getItem(historySyncEncryptKey);
  if (syncEncrypt) {
    try {
      historySyncEncrypt.value = JSON.parse(syncEncrypt);
    } catch (_) {}
  }
  // load last sync time
  const syncStartTime = localStorage.getItem(historySyncStartTimeKey);
  if (syncStartTime) {
    try {
      historySyncStartTime.value = JSON.parse(syncStartTime);
    } catch (_) {}
  }
  // start sync
  if (historySync.value && historySyncEncrypt.value.length > 0) {
    historySyncEncryptObj.value = new Encryption(historySyncEncrypt.value);
    doHistorySync();
  }
});

// websocket
const onWebSocketClose = () => {
  if (historySync.value && historySyncEncrypt.value.length > 0) {
    updateChatHistoryAPI({
      message_id: currentMessageID.value,
      action: SyncAction.Update,
      content: historySyncEncryptObj.value.encrypt(localMessages.value),
    });
  }
};

// loading
const chatLoading = ref(false);
const setChatLoading = (status) => handleLoading(chatLoading, status);

// System Define
const localSystemDefineKey = ref('local-system-define');
const systemDefine = ref('');
const setSystemDefine = (define) => {
  systemDefine.value = define;
  setLocalStorage(localSystemDefineKey.value, JSON.stringify(define));
};
onMounted(() => {
  const value = localStorage.getItem(localSystemDefineKey.value);
  if (value) {
    try {
      setSystemDefine(JSON.parse(value));
    } catch (e) {
      setSystemDefine('');
    }
  } else {
    setSystemDefine('');
  }
});

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
        :system-define="systemDefine"
        :chat-loading="chatLoading"
        @toggle-user-behavior="toggleUserBehavior"
        @re-generate="reGenerate"
      />
      <a-divider />
      <chat-input
        ref="chatInputRef"
        :user-behavior="userBehavior"
        :local-messages="localMessages"
        :chat-loading="chatLoading"
        :system-define="systemDefine"
        @add-message="addMessage"
        @set-chat-loading="setChatLoading"
        @save-message="saveMessage"
        @toggle-user-behavior="toggleUserBehavior"
        @replace-messages="replaceMessages"
        @set-prompt-form="setPromptForm"
        @set-system-define="setSystemDefine"
        @show-history="showHistory"
        @on-web-socket-close="onWebSocketClose"
      />
    </div>
    <a-modal
      v-model:visible="historyVisible"
      :esc-to-close="true"
      :footer="false"
      @before-open="onHistoryOpen"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('ChatMessageHistory') }}
        </div>
      </template>
      <a-space
        direction="vertical"
        class="history-space"
      >
        <a-space class="history-space-button-box">
          <a-button
            @click="hideHistoryAndNewMessage"
            :disabled="chatLoading"
            style="width: 100%"
          >
            <template #icon>
              <icon-plus :style="{ fontSize: '14px' }" />
            </template>
            {{ $t('StartNewChat') }}
          </a-button>
          <a-button
            :type="historySync ? 'primary' : 'secondary'"
            :status="historySync ? 'success' : 'normal'"
            @click="showHistorySyncConfig"
          >
            <template #icon>
              <icon-cloud />
            </template>
          </a-button>
        </a-space>
        <a-list
          v-if="Object.keys(sortedMessageStore).length > 0"
          :max-height="320"
        >
          <a-list-item
            v-for="(data, messageID) in sortedMessageStore"
            :key="messageID"
          >
            <template #extra>
              <a-button
                type="text"
                size="mini"
                style="color: unset"
                @click="removeMessage(messageID, true)"
                :disabled="chatLoading"
              >
                <template #icon>
                  <icon-delete style="color: var(--color-danger-light-4)" />
                </template>
              </a-button>
            </template>
            <a-space direction="vertical">
              <a-link
                @click="changeCurrentMessage(messageID)"
                :disabled="chatLoading"
                style="word-break: break-all;"
              >
                {{ `${(data.title || messageID).slice(0, 64)}...` }}
              </a-link>
              <a-space
                style="display: flex; align-items: center"
                :size="4"
              >
                <icon-clock-circle />
                {{ moment.unix(data.created_at).format('YY/MM/DD HH:mm') }}
              </a-space>
            </a-space>
          </a-list-item>
        </a-list>
        <div style="width: 100%; text-align: center; color: var(--color-text-3); font-size: 12px">
          {{ $t('TempStorageUsed', {total: (localStorageSize / 1024 / 1024).toFixed(3)}) }}
        </div>
      </a-space>
    </a-modal>
    <a-modal
      v-model:visible="historySyncConfigVisible"
      :esc-to-close="true"
      :footer="false"
    >
      <template #title>
        <div style="text-align: left; width: 100%">
          {{ $t('SyncHistoryConfig') }}
        </div>
      </template>
      <a-space
        direction="vertical"
        :size="10"
      >
        <div style="font-size: 14px; color: rgb(var(--orange-6))">
          {{ $t('SyncHistoryTips') }}
        </div>
        <a-input
          v-if="!historySync"
          v-model="historySyncEncrypt"
          :placeholder="$t('PleaseInputSyncEncrypt')"
          :max-length="16"
          show-word-limit
        />
        <a-space class="sync-history-config-button-box">
          <a-button
            v-if="!historySync"
            status="success"
            :disabled="historySync || !historySyncEncrypt"
            @click="enableHistorySync"
          >
            {{ $t('EnableSync') }}
          </a-button>
          <a-button
            v-else
            status="warning"
            :disabled="!historySync"
            @click="disableHistorySync"
          >
            {{ $t('DisableSync') }}
          </a-button>
        </a-space>
      </a-space>
    </a-modal>
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
  max-height: calc(100 * var(--vh) - 160px);
}

.history-space,
.history-space > :deep(.arco-space-item) {
  width: 100%;
}

.history-space-button-box,
.history-space-button-box > :deep(.arco-space-item):nth-child(1) {
  width: 100%;
}

.sync-history-config-button-box,
.sync-history-config-button-box > :deep(.arco-space-item),
.sync-history-config-button-box > :deep(.arco-space-item) > button{
  width: 100%;
}
</style>
