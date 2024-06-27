import http from './index';

export const getCOSConfigAPI = () => new Promise((resolve, reject) => {
  http.get('/cos/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const getCOSUploadTempKeyAPI = (filename, purpose, tcaptcha) => new Promise((resolve, reject) => {
  http.post('/cos/temp_secret/', {filename, purpose, tcaptcha}).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const extractFileAPI = (key) => new Promise((resolve, reject) => {
  http.post('/cos/extract_file/', {key}).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
