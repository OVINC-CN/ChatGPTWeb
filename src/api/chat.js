import http from './index';

export const preCheckAPI = (data) => new Promise((resolve, reject) => {
  http.post('/chat/pre_check/', data).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const getChatLogs = (params) => new Promise((resolve, reject) => {
  http.get('/chat/logs/', {params}).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
