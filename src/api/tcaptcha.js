import http from './index';

export const getTCaptchaConfigAPI = () => new Promise((resolve, reject) => {
  http.get('/tcaptcha/config/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
