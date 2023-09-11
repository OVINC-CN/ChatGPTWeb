<script setup>
import { signInAPI } from '../api/user';
import { onMounted } from 'vue';
import { Message } from '@arco-design/web-vue';

const doLogin = () => {
  const url = new URL(window.location.href);
  const next = url.searchParams.get('next');
  const code = url.searchParams.get('code');
  console.log(next);
  signInAPI({ code }).then(
    () => {},
    (err) => {
      Message.error(err.response.data.message);
    },
  )
    .finally(() => {
      setTimeout(() => {
        window.location.href = next;
      }, 2000);
    });
};

onMounted(() => doLogin());
</script>

<template>
  <a-spin
    :loading="true"
    :tip="$t('VerifyingUserInfo')"
    :size="32"
    style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column"
  />
</template>

<style scoped>

</style>
