<template>
  <a-config-provider :locale="locale">
    <a-spin
      :size="32"
      :loading="mainLoading"
      :tip="$t('loading')"
    >
      <a-layout
        id="app-layout"
        :style="{maxWidth: fullScreen ? '100%' : '1600px'}"
      >
        <a-layout-header id="app-header">
          <div
            id="app-menu-logo"
            style="cursor: pointer"
            @click="goTo('Chat')"
          >
            <div>
              ChatGPT
            </div>
          </div>
          <a-space id="app-header-right">
            <icon-fullscreen-exit
              v-if="fullScreen"
              style="font-weight: bold; margin-right: 10px; cursor: pointer"
              @click="toggleFullScreen"
            />
            <icon-fullscreen
              v-else
              style="font-weight: bold; margin-right: 10px; cursor: pointer"
              @click="toggleFullScreen"
            />
            <a-dropdown @select="changeLangAndReload">
              <icon-public id="app-header-menu-lang" />
              <template #content>
                <a-doption
                  v-for="item in langOption"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.name }}
                </a-doption>
              </template>
            </a-dropdown>
            <a-button
              type="text"
              style="padding: 0; color: unset"
              @click="showUserInfo"
            >
              <a-badge
                status="success"
                dot
                :count="1"
                v-if="user.username"
              >
                <icon-user />
              </a-badge>
              <icon-user v-else />
            </a-button>
          </a-space>
        </a-layout-header>
        <a-layout-content>
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </a-layout-content>
        <a-layout-footer id="app-footer">
          Copyright&nbsp;&copy;&nbsp;2022 - {{ currentYear }} OVINC-CN
        </a-layout-footer>
      </a-layout>
    </a-spin>
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
                  >
                    {{ $t('Refresh') }}
                  </a-button>
                </a-space>
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
            {{ record.prompt_tokens + record.completion_tokens }}
          </template>
          <template #price="{ record }">
            {{
              (
                (
                  record.prompt_tokens * record.prompt_token_unit_price / 1000
                  + record.completion_tokens * record.completion_token_unit_price / 1000
                )
              ).toFixed(4)
            }}
          </template>
        </a-table>
      </div>
    </a-modal>
    <a-modal
      v-model:visible="chargeVisible"
      :footer="false"
      :esc-to-close="true"
      modal-class="charge-modal"
      :unmount-on-close="true"
    >
      <template #title>
        <div style="width: 100%; text-align: left;">
          {{ $t('Charge') }}
        </div>
      </template>
      <div
        v-if="chargeImage"
        style="display: flex; width: 100%; align-items: center; justify-content: center; flex-direction: column"
      >
        <div style="display: flex; align-items: center; justify-content: center">
          <icon-wechatpay style="color: rgb(var(--green-6)); margin-right: 8px" />
          {{ $t('WeChatScan') }}
        </div>
        <a-image
          :src="'data:image/png;base64,' + chargeImage"
          width="200px"
          height="200px"
          fit="contain"
        />
        <a-button
          @click="showUserInfo"
          status="success"
          type="primary"
        >
          {{ $t('FinishCharge') }}
        </a-button>
      </div>
      <a-form
        v-else
        :auto-label-width="true"
        @submit="getChargeImage"
      >
        <a-form-item :label="$t('Amount')">
          <a-input-number
            v-model="chargeAmount"
            :min="1"
            :precision="0"
            :hide-button="true"
            :disabled="chargeLoading"
          >
            <template #append>
              {{ walletConfig.unit }}
            </template>
          </a-input-number>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button
              @click="chargeVisible = false"
              :loading="chargeLoading"
            >
              {{ $t('Cancel') }}
            </a-button>
            <a-button
              type="primary"
              html-type="submit"
              :loading="chargeLoading"
            >
              {{ $t('Charge') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-config-provider>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {useStore} from 'vuex';
import {locale, langOption, changeLangAndReload} from './locale';
import {useI18n} from 'vue-i18n';
import {useRoute, useRouter} from 'vue-router';
import Aegis from 'aegis-web-sdk';
import {getRUMConfigAPI} from './api/trace';
import {getMyWalletAPI, getPreChargeAPI, getWalletConfigAPI} from '@/api/wallet';
import {getChatLogs} from '@/api/chat';
import {handleLoading} from '@/utils/loading';
import {Message} from '@arco-design/web-vue';
import {signOutAPI} from '@/api/user';

// display
const fullScreen = ref(true);
const fullScreenKey = ref('full-screen');
const toggleFullScreen = () => {
  fullScreen.value = !fullScreen.value;
  localStorage.setItem(fullScreenKey.value, fullScreen.value ? 'true' : 'false');
};
onMounted(() => {
  fullScreen.value = localStorage.getItem(fullScreenKey.value) === 'true';
});

// locale
const i18n = useI18n();

// title
const title = ref(i18n.t('ChatGPTOVINC'));
document.title = title.value;

// menu
const menu = ref([]);
const route = useRoute();
const router = useRouter();
const currentMenuItem = ref('');
const goTo = (key) => {
  router.push({name: key});
};
menu.value.forEach((item, index) => {
  if (index === 0) return;
  if (window.location.pathname.startsWith(item.path_match)) currentMenuItem.value = item.key;
});

// footer
const currentYear = ref(new Date().getFullYear());

// store
const store = useStore();
const mainLoading = computed(() => store.state.mainLoading);
onMounted(() => {
  store.dispatch('getUserInfo');
  store.dispatch('getModels');
});

// user
const user = computed(() => store.state.user);
const userInfoVisible = computed(() => store.state.userInfoVisible);
const showUserInfo = () => {
  chargeVisible.value = false;
  store.commit('setUserInfoVisible', true);
};
const hideUserInfo = () => {
  store.commit('setUserInfoVisible', false);
};
const doLogout = () => {
  signOutAPI().then(
      () => window.location.reload(),
      (err) => Message.error(err.response.data.message),
  );
};

// wallet
const walletBalance = ref(0);
const loadWalletBalance = () => {
  getMyWalletAPI().then((res) => walletBalance.value = res.data.balance);
};
watch(() => store.state.userInfoVisible, () => {
  if (store.state.userInfoVisible) {
    loadWalletBalance();
  }
});
const walletConfig = ref({is_enabled: false, unit: ''});
const loadWalletConfig = () => {
  getWalletConfigAPI().then(
      (res) => walletConfig.value = res.data,
      (err) => Message.error(err.response.data.message),
  );
};
onMounted(() => loadWalletConfig());
const chargeVisible = ref(false);
const showCharge = () => {
  hideUserInfo();
  chargeVisible.value = true;
};
const chargeLoading = ref(false);
const chargeAmount = ref(1);
const chargeImage = ref('');
const getChargeImage = () => {
  handleLoading(chargeLoading, true);
  getPreChargeAPI(chargeAmount.value).then(
      (res) => {
        chargeImage.value = res.data;
      },
      (err) => Message.error(err.response.data.message),
  ).finally(() => handleLoading(chargeLoading, false));
};
watch(() => chargeVisible.value, () => {
  if (!chargeVisible.value) {
    chargeAmount.value = 1;
    chargeImage.value = '';
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
onMounted(() => loadChatLog());
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

// aegis
const initRUM = () => {
  getRUMConfigAPI()
      .then((res) => {
        if (res.data.id) {
          new Aegis(res.data);
        }
      })
      .finally(() => {
        store.dispatch('setMainLoading', false);
      });
};
onMounted(() => initRUM());
</script>

<style>
@import "App.css";

#app {
  display: flex;
  justify-content: center;
}

#app-layout {
  height: calc(100 * var(--vh));
  width: 100vw;
}

#app-header {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border-1);
  display: flex;
  justify-content: space-between;
}

#app-header > div {
  display: flex;
  justify-content: space-around;
}

#app-header-right {
  display: flex;
  align-items: center;
  padding: 14px 20px 14px 0;
}

#app-menu-logo {
  padding-left: 0;
  margin-left: 0;
}

#app-header-menu-lang {
  cursor: pointer;
  margin-right: 12px;
}

#app-menu-logo > div {
  border-radius: var(--border-radius-medium);
  background: var(--color-fill-3);
  cursor: text;
  color: var(--color-text-1);
  text-align: center;
  font-weight: bold;
  height: 30px;
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#app-menu-logo {
  padding: 14px 0 14px 20px;
  margin-right: 20px;
}

#app-footer {
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  height: 48px;
  border-top: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  margin-top: 20px;
}

.user-info-wd-100 {
  width: 100%;
}

.user-info-modal,
.charge-modal {
  max-width: calc(100vw - 40px);
  max-height: calc(100 * var(--vh) - 40px);
}

.user-info-modal .arco-statistic-content .arco-statistic-value-decimal,
.user-info-modal .arco-statistic-content .arco-statistic-value-integer{
  font-size: 24px!important;
  font-weight: unset!important;
}
</style>
