import http from './index';

export const getRUMConfigAPI = () => new Promise((resolve, reject) => {
  http.get('/rum/config/').then(
    res => resolve(res),
    err => reject(err),
  );
});
