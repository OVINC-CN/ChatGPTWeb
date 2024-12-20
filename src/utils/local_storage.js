import {Modal} from '@arco-design/web-vue';
import i18n from '@/locale';
import moment from 'moment';

export const getLocalStorageSize = () => {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += (localStorage[key].length + key.length) * 2;
    }
  }
  return total;
};

let lastNotice = 0;
const noticeSilencePeriod = 60;
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if ((e.name === 'QuotaExceededError' || e.code === 22) && lastNotice + noticeSilencePeriod < moment().unix()) {
      lastNotice = moment().unix();
      Modal.error(
          {
            title: i18n.global.t('QuotaExceededError'),
            content: i18n.global.t('LocalStorageQuotaExceededError'),
          },
      );
    }
  }
};
