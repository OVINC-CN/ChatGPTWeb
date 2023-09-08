import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from './locale'

import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';

const app = createApp(App);

app.use(store);
app.use(router);
app.use(i18n);
app.use(ArcoVue);
app.use(ArcoVueIcon);
app.mount('#app');
