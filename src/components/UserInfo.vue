<script setup>
import {useStore} from 'vuex';
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {signOutAPI} from '@/api/user';
import {Message} from '@arco-design/web-vue';
import {getMyWalletAPI} from '@/api/wallet';
import {handleLoading} from '@/utils/loading';
import {getChatLogs} from '@/api/chat';
import {useI18n} from 'vue-i18n';

const store = useStore();
const walletConfig = computed(() => store.state.walletConfig);
const user = computed(() => store.state.user);
const userInfoVisible = computed(() => store.state.userInfoVisible);
const hideUserInfo = () => {
  store.commit('setUserInfoVisible', false);
};

const i18n = useI18n();

const doLogout = () => {
  signOutAPI().then(
      () => window.location.reload(),
      (err) => Message.error(err.response.data.message),
  );
};

const walletBalance = ref(0);
const walletBalanceLoading = ref(false);
const loadWalletBalance = () => {
  handleLoading(walletBalanceLoading, true);
  getMyWalletAPI().then(
      (res) => walletBalance.value = res.data.balance,
  ).finally(() => handleLoading(walletBalanceLoading, false));
};
watch(() => store.state.userInfoVisible, () => {
  if (store.state.userInfoVisible) {
    loadWalletBalance();
  }
});

// chat log
const logLoading = ref(false);
const chatLogs = ref([]);
const logColumns = ref(
    [
      {
        title: i18n.t('RequestTime'),
        slotName: 'created_at',
      },
      {
        title: i18n.t('ModelName'),
        slotName: 'model_name',
      },
      {
        title: i18n.t('Tokens'),
        slotName: 'tokens',
      },
      {
        title: i18n.t('Price'),
        slotName: 'price',
      },
    ],
);
const chatLogPage = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  simple: true,
  showTotal: true,
});
const loadChatLog = () => {
  handleLoading(logLoading, true);
  getChatLogs({page: chatLogPage.value.current, size: chatLogPage.value.pageSize}).then(
      (res) => {
        chatLogs.value = res.data.results;
        chatLogPage.value.total = res.data.total;
      },
      (err) => Message.error(err.response.data.message),
  ).finally(() => handleLoading(logLoading, false));
};
const handlePageChange = (page) => {
  chatLogPage.value.current = page;
  loadChatLog();
};
const handlerPageSizeChange = (size) => {
  chatLogPage.value.current = 1;
  chatLogPage.value.pageSize = size;
  loadChatLog();
};
watch(() => store.state.userInfoVisible, () => {
  if (store.state.userInfoVisible) {
    handlePageChange(1);
  }
});
const tableHeight = ref('200px');
const doTableResize = (_) => {
  tableHeight.value = `${Math.min(window.innerHeight - 330, 200)}px`;
};
onMounted(() => {
  doTableResize(null);
  window.addEventListener('resize', doTableResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', doTableResize);
});

const showCharge = () => {
  hideUserInfo();
  store.commit('setChargeVisible', true);
};
</script>

<template>
  <a-modal
    :visible="userInfoVisible"
    :footer="false"
    :esc-to-close="true"
    modal-class="user-info-modal"
    :unmount-on-close="true"
    @cancel="hideUserInfo"
  >
    <template #title>
      <div style="width: 100%; text-align: left">
        {{ $t('UserInfo') }}
      </div>
    </template>
    <div class="user-info-wd-100">
      <div
        class="user-info-wd-100"
        style="display: flex; justify-content: space-around; align-items: center"
      >
        <div class="arco-statistic">
          <div class="arco-statistic-title">
            <a-space :size="4">
              <div>
                {{ $t('Username') }}
              </div>
              <a-button
                type="text"
                style="margin: 0; padding: 0"
                @click="doLogout"
              >
                {{ $t('Logout') }}
              </a-button>
            </a-space>
          </div>
          <div class="arco-statistic-content">
            <div class="arco-statistic-value">
              <span class="arco-statistic-value-integer">
                {{ user.nick_name ? user.nick_name : '- -' }}
              </span>
            </div>
          </div>
        </div>
        <div>
          <a-statistic
            :value="walletBalance"
            :precision="4"
          >
            <template #title>
              <a-space :size="4">
                <span>{{ $t('Balance') }}</span>
                <a-button
                  v-if="walletConfig.is_enabled"
                  @click="showCharge"
                  type="text"
                  status="success"
                  style="margin: 0; padding: 0"
                >
                  {{ $t('Charge') }}
                </a-button>
                <a-button
                  @click="loadWalletBalance"
                  type="text"
                  style="margin: 0; padding: 0"
                  :disabled="walletBalanceLoading"
                >
                  {{ $t('Refresh') }}
                </a-button>
              </a-space>
            </template>
            <template #prefix>
              <icon-loading v-if="walletBalanceLoading" />
            </template>
            <template #suffix>
              {{ walletConfig.unit }}
            </template>
          </a-statistic>
        </div>
      </div>
      <a-divider style="margin: 32px 0">
        <div style="color: var(--color-neutral-6)">
          {{ $t('ChatHistory') }}
        </div>
      </a-divider>
      <a-table
        :loading="logLoading"
        :columns="logColumns"
        :data="chatLogs"
        :pagination="chatLogPage"
        @page-change="handlePageChange"
        @page-size-change="handlerPageSizeChange"
        page-position="bottom"
        :virtual-list-props="{height: tableHeight}"
      >
        <template #created_at="{ record }">
          <div style="word-break: break-word">
            {{ record.created_at }}
          </div>
        </template>
        <template #model_name="{ record }">
          <div style="word-break: break-word">
            {{ record.model_name }}
          </div>
        </template>
        <template #tokens="{ record }">
          <a-tooltip background-color="var(--color-bg-1)">
            <a-button
              type="text"
              style="color: unset; padding: 0; margin: 0"
            >
              {{ record.prompt_tokens + record.completion_tokens }}
            </a-button>
            <template #content>
              <div style="color: var(--color-neutral-10)">
                <div>{{ $t('PromptTokens') }}:&nbsp;{{ record.prompt_tokens }}</div>
                <div>{{ $t('CompletionTokens') }}:&nbsp;{{ record.completion_tokens }}</div>
                <div>{{ $t('VisionCount') }}:&nbsp;{{ record.vision_count }}</div>
              </div>
            </template>
          </a-tooltip>
        </template>
        <template #price="{ record }">
          <a-tooltip background-color="var(--color-bg-1)">
            <a-button
              type="text"
              style="color: unset; padding: 0; margin: 0"
            >
              {{
                (
                  record.prompt_tokens * record.prompt_token_unit_price / 1000
                  + record.completion_tokens * record.completion_token_unit_price / 1000
                  + record.vision_count * record.vision_unit_price / 1000
                  + record.request_unit_price / 1000
                ).toFixed(4)
              }}
            </a-button>
            <template #content>
              <div style="color: var(--color-neutral-10)">
                <div>{{ $t('PromptPrice') }}:&nbsp;{{ (record.prompt_tokens * record.prompt_token_unit_price / 1000).toFixed(4) }}</div>
                <div>{{ $t('CompletionPrice') }}:&nbsp;{{ (record.completion_tokens * record.completion_token_unit_price / 1000).toFixed(4) }}</div>
                <div>{{ $t('VisionPrice') }}:&nbsp;{{ (record.vision_count * record.vision_unit_price / 1000).toFixed(4) }}</div>
                <div>{{ $t('RequestPrice') }}:&nbsp;{{ (record.request_unit_price / 1000).toFixed(4) }}</div>
              </div>
            </template>
          </a-tooltip>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<style scoped>

</style>
