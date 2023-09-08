import http from './index';

export const changeLangAPI = language => new Promise((resolve, reject) => {
  http.post('/i18n/', { language }).then(
    res => resolve(res),
    err => reject(err),
  );
});
