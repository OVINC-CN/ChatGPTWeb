import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from './locale';

import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';

import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';
import createKatexPlugin from '@kangc/v-md-editor/lib/plugins/katex/cdn';

import hljs from 'highlight.js';

VMdPreview.use(githubTheme, {
  Hljs: hljs,
});
VMdPreview.use(createKatexPlugin());

const app = createApp(App);

app.use(store);
app.use(router);
app.use(i18n);
app.use(ArcoVue);
app.use(ArcoVueIcon);
app.use(VMdPreview);
app.mount('#app');
