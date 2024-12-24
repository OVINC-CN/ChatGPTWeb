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
            <img
              height="32px"
              src="/logo.png"
              alt="logo"
            >
          </div>
          <a-space id="app-header-right">
            <icon-question
              style="font-weight: bold; margin-right: 10px; cursor: pointer"
              @click="startGuide"
            />
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
              id="user-info"
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
    <user-info />
    <user-charge />
  </a-config-provider>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {useStore} from 'vuex';
import {locale, langOption, changeLangAndReload} from './locale';
import {useI18n} from 'vue-i18n';
import {useRoute, useRouter} from 'vue-router';
import Aegis from 'aegis-web-sdk';
import {getRUMConfigAPI} from './api/trace';
import UserCharge from '@/components/UserCharge.vue';
import UserInfo from '@/components/UserInfo.vue';
import {setLocalStorage} from '@/utils/local_storage';
import introJs from 'intro.js';

// display
const fullScreen = ref(true);
const fullScreenKey = ref('full-screen');
const toggleFullScreen = () => {
  fullScreen.value = !fullScreen.value;
  setLocalStorage(fullScreenKey.value, fullScreen.value ? 'true' : 'false');
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
  store.dispatch('getWalletConfig');
});

// user
const user = computed(() => store.state.user);
const showUserInfo = () => {
  store.commit('setChargeVisible', false);
  store.commit('setUserInfoVisible', true);
};

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

// watch static file change
const staticFileEtagKey = 'static-page-etag';
const watchStaticFileChange = ref(null);
onMounted(() => {
  watchStaticFileChange.value = setInterval(
      () => {
        try {
          fetch(window.location.href, {method: 'HEAD'})
              .then((res) => {
                const serverETag = res.headers.get('ETag');
                const localETag = localStorage.getItem(staticFileEtagKey);
                if (localETag && serverETag && localETag !== serverETag) {
                  if (confirm(i18n.t('NewVersionOfStaticPage'))) {
                    location.reload();
                  }
                }
                setLocalStorage(staticFileEtagKey, serverETag);
              });
        } catch (e) {
          console.log('fetch static file failed', e);
        }
      }, 60 * 10 * 1000,
  );
});
onUnmounted(() => clearInterval(watchStaticFileChange.value));

// guide
const startGuide = () => {
  introJs()
      .setOptions({
        steps: [
          {
            element: '#user-info',
            title: i18n.t('UserInfo'),
            intro: i18n.t('UserInfoButtonGuide'),
          },
          {
            element: '#change-model-button',
            title: i18n.t('Model'),
            intro: i18n.t('ChangeModelButtonGuide'),
          },
          {
            element: '#system-define-button',
            title: i18n.t('SystemDefine'),
            intro: i18n.t('SystemDefineButtonGuide'),
          },
          {
            element: '#upload-image-button',
            title: i18n.t('UploadImage'),
            intro: i18n.t('UploadImageButtonGuide'),
          },
          {
            element: '#history-message-button',
            title: i18n.t('ChatMessageHistory'),
            intro: i18n.t('ChatMessageHistoryButtonGuide'),
          },
          {
            element: '#max-message-button',
            title: i18n.t('MaxMessagesCount'),
            intro: i18n.t('MaxMessagesCountButtonGuide'),
          },
        ],
        disableInteraction: true,
        showStepNumbers: true,
        exitOnOverlayClick: false,
        showBullets: false,
        showProgress: false,
        tooltipClass: 'user-guide',
        nextLabel: i18n.t('NextStep'),
        prevLabel: i18n.t('PreviousStep'),
        doneLabel: i18n.t('Done'),
      })
      .start();
};
</script>

<style>
@import "App.css";
@import 'intro.js/introjs.css';
@import "intro.js/themes/introjs-modern.css";

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

.arco-btn-size-medium,
.arco-modal,
.arco-select-view-single,
.arco-descriptions-border .arco-descriptions-body,
.arco-textarea-wrapper,
.arco-list,
.arco-input-number,
.arco-select-dropdown {
  border-radius: var(--border-radius-large) !important;
  overflow: hidden;
}

.introjs-helperLayer {
  box-shadow: rgb(var(--arcoblue-4)) 0 0 1px 2px, rgba(33, 33, 33, 0.5) 0 0 0 5000px !important;
}

.user-guide .introjs-tooltip-header {
  padding: 10px;
}

.user-guide .introjs-tooltip-header .introjs-tooltip-title {
  font-size: 16px;
}

.user-guide .introjs-tooltip-header .introjs-skipbutton {
  height: 41px;
  width: 41px;
  line-height: 41px;
  color: white;
}

.user-guide .introjs-tooltiptext {
  padding: 10px;
}

.user-guide .introjs-helperNumberLayer {
  display: none;
}

.introjs-tooltipReferenceLayer {
  visibility: visible;
}
</style>
