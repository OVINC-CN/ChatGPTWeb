import http from './index';

export const getMyWalletAPI = () => new Promise((resolve, reject) => {
  http.get('/wallets/mine/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const getWalletConfigAPI = () => new Promise((resolve, reject) => {
  http.get('/wallets/config/').then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});

export const getPreChargeAPI = (amount) => new Promise((resolve, reject) => {
  http.post('/wallets/pre_charge/', {amount}).then(
      (res) => resolve(res),
      (err) => reject(err),
  );
});
