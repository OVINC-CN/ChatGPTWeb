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

export const getChatHistoryAPI = (params) => new Promise((resolve, reject) => {
  http.get('/message_log/', {params}).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const updateChatHistoryAPI = (data) => new Promise((resolve, reject) => {
  http.post(`/message_log/`, data).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
