import http from './index';

export const listModelsAPI = () => new Promise((resolve, reject) => {
  http.get('/models/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const listSystemPresetAPI = () => new Promise((resolve, reject) => {
  http.get('/system_presets/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
