import http from './index';

export const preCheckAPI = (data) => new Promise((resolve, reject) => {
  http.post('/chat/pre_check/', data).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
