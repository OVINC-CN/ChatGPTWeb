import http from './index';

export const listToolsAPI = () => new Promise((resolve, reject) => {
  http.get('/tools/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
