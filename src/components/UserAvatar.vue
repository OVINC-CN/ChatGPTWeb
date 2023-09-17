<template>
  <a-avatar
    :id="isLogin ? 'app-menu-avatar' : 'app-menu-avatar-no-login'"
    :class="{'app-menu-avatar-backgroud': !userAvatar}"
    :size="props.size"
    shape="circle"
    @click="goTo('User')"
  >
    <img
      alt="avatar"
      :src="userAvatar"
      v-if="userAvatar"
    >
    <span v-else-if="isLogin">
      {{ user.nickname? user.nickname.slice(0, 1) : user.username.slice(0, 1) }}
    </span>
    <icon-user v-else />
  </a-avatar>
</template>

<script setup>
import {useStore} from 'vuex';
import {computed} from 'vue';

// props
const props = defineProps({
  size: {
    type: Number,
    default: null,
  },
});

// store
const store = useStore();
const isLogin = computed(() => store.state.isLogin);
const user = computed(() => store.state.user);
const userAvatar = computed(() => store.state.userProperties.avatar);
</script>

<style scoped>
#app-menu-avatar {
  cursor: pointer;
  overflow: hidden;
}

#app-menu-avatar-no-login {
  background: var(--color-neutral-4);
}

.app-menu-avatar-backgroud {
  background: rgb(var(--arcoblue-5));
}
</style>
