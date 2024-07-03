<script setup>
import {useStore} from 'vuex';
import {computed, ref, watch} from 'vue';
import {handleLoading} from '@/utils/loading';
import {getPreChargeAPI} from '@/api/wallet';
import {Message} from '@arco-design/web-vue';

const store = useStore();
const chargeVisible = computed(() => store.state.chargeVisible);
const handleCloseCharge = () => {
  store.commit('setChargeVisible', false);
};
const walletConfig = computed(() => store.state.walletConfig);

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
watch(() => store.state.chargeVisible, () => {
  if (!store.state.chargeVisible) {
    chargeAmount.value = 1;
    chargeImage.value = '';
  }
});

const showUserInfo = () => {
  handleCloseCharge();
  store.commit('setUserInfoVisible', true);
};
</script>

<template>
  <a-modal
    v-model:visible="chargeVisible"
    :footer="false"
    :esc-to-close="true"
    modal-class="charge-modal"
    :unmount-on-close="true"
    @cancel="showUserInfo"
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
            @click="showUserInfo"
            :loading="chargeLoading"
          >
            {{ $t('Cancel') }}
          </a-button>
          <a-button
            type="primary"
            html-type="submit"
            :loading="chargeLoading"
            status="success"
          >
            {{ $t('Charge') }}
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>

</style>
