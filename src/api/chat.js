import globalContext from '../context';
import http from './index';

export const createChatAPI = (data) => new Promise((resolve, reject) => {
  fetch(`${globalContext.backendUrl}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  }).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const preCheckAPI = (data) => new Promise((resolve, reject) => {
  http.post('/chat/pre_check/', data).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
