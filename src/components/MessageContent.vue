<script setup>
import {Role} from '@/constants';
import {useStore} from 'vuex';
import {computed} from 'vue';
import {IconFile} from '@arco-design/web-vue/es/icon';

const props = defineProps({
  message: {
    type: Object,
    default: () => ({
      role: Role.Assistant,
      content: '',
      file: null,
    }),
  },
  isLast: {
    type: Boolean,
    default: false,
  },
  chatLoading: {
    type: Boolean,
    default: false,
  },
});

const store = useStore();
const user = computed(() => store.state.user);

const regex = /(\.jpg|\.png|\.jpeg|\.webp|\.heif)/;

const emits = defineEmits(['reGenerate', 'onImageClick']);

const onImageClick = (images, index) => emits('onImageClick', images[index]);
</script>

<template>
  <div
    class="message-content"
    :style="{
      justifyContent: message.role === Role.Assistant ? 'flex-start': 'flex-end',
      textAlign: message.role === Role.Assistant ? 'left': 'right'
    }"
  >
    <a-avatar
      v-show="false"
      style="background: white; margin-right: 10px; min-width: 40px"
      v-if="message.role === Role.Assistant"
    >
      <img
        alt="ChatGPT Logo"
        src="/logo.png"
      >
    </a-avatar>
    <div
      class="message-content-content"
      :style="{
        background: message.role === Role.System ? 'rgb(var(--danger-4))' : message.role === Role.Assistant ? 'var(--color-fill-1)': 'rgb(var(--primary-5))',
        color: message.role === Role.Assistant ? 'unset' : 'white',
        textAlign: 'left'
      }"
    >
      <div
        v-if="message.role === Role.System"
        style="margin-bottom: 10px"
      >
        <icon-bulb />
        {{ $t('SystemDefine') }}
      </div>
      <div
        v-if="message.file && message.previewFile"
        class="message-content-content-img"
      >
        <a-image
          v-if="regex.test(message.file)"
          :src="message.previewFile"
          height="200px"
          fit="cover"
        />
        <a-link
          v-else
          :href="message.previewFile"
          target="_blank"
          style="padding: unset"
        >
          <a-space
            :size="2"
          >
            <icon-file />
            {{ message.file.split('/').slice(-1)[0] }}
          </a-space>
        </a-link>
      </div>
      <v-md-preview
        v-show="message.content"
        :text="message.content"
        class="v-md-preview"
        :class="{'v-md-preview-u': message.role === Role.User || message.role === Role.System}"
        @image-click="onImageClick"
      />
      <icon-loading v-show="isLast && chatLoading && !message.content" />
    </div>
    <a-avatar
      v-show="false"
      v-if="message.role === Role.User || message.role === Role.System"
      style="margin-left: 10px; min-width: 40px; background: rgb(var(--primary-4))"
    >
      {{ user.nick_name }}
    </a-avatar>
    <icon-refresh
      @click="emits('reGenerate')"
      v-if="isLast && !chatLoading && message.role === Role.Assistant"
      class="message-content-content-icon-refresh"
    />
  </div>
</template>

<style scoped>
.message-content {
  display: flex;
  align-items: flex-start;
}

.message-content-content {
  padding: 10px;
  box-sizing: border-box;
  border-radius: var(--border-radius-large);
  overflow-x: auto;
  box-shadow: var(--shadow-special);
}

.message-content-content-img {
  border-radius: var(--border-radius-large);
  overflow: hidden;
  margin-bottom: 10px;
}

.v-md-preview :deep(.github-markdown-body) {
  padding: 0;
  font-size: 14px;
}

.v-md-preview :deep(.github-markdown-body) > p {
  margin-bottom: 0;
}

.v-md-preview :deep(.github-markdown-body) pre {
  padding: 10px;
  background: var(--color-fill-3);
  margin: 10px 0;
  border-radius: var(--border-radius-medium);
}

.v-md-preview :deep(.github-markdown-body) div[class*=v-md-pre-wrapper-] {
  background: var(--color-fill-3);
  border-radius: var(--border-radius-medium);
  overflow: hidden;
  margin: 10px 0;
}

.v-md-preview-u :deep(.github-markdown-body) a {
  color: white;
  text-decoration: underline;
}

.v-md-preview-u :deep(.github-markdown-body) h6 {
  color: unset;
}

.v-md-preview-u :deep(.github-markdown-body) blockquote {
  color: var(--color-text-4);
}

.v-md-preview-u :deep(.github-markdown-body) table {
  color: var(--color-text-1);
}

.v-md-preview-u :deep(.github-markdown-body) code,
.v-md-preview-u :deep(.github-markdown-body) pre,
.v-md-preview :deep(.github-markdown-body) div[class*=v-md-pre-wrapper-] {
  background: rgb(var(--arcoblue-1));
}

.v-md-preview-u :deep(.github-markdown-body) code {
  color: var(--color-text-1);
}

.message-content-content-icon-refresh {
  min-width: 18px;
  min-height: 18px;
  margin: 6px 0 0 6px;
  cursor: pointer;
  color: var(--color-neutral-4);
}

.message-content-content-icon-refresh:hover {
  color: var(--color-neutral-10);
}
</style>
