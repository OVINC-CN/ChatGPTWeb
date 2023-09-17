import http from './index';
import globalContext from '../context';

export const getUserInfoAPI = () => new Promise((resolve, reject) => {
  http.get(`${globalContext.backendUrl}/account/user_info/`).then((res) => resolve(res), (err) => reject(err));
});

export const signInAPI = (data) => new Promise((resolve, reject) => {
  http.post(`${globalContext.backendUrl}/account/sign_in/`, data).then((res) => resolve(res), (err) => reject(err));
});

export const signOutAPI = () => new Promise((resolve, reject) => {
  http.get(`${globalContext.backendUrl}/account/sign_out/`).then((res) => resolve(res), (err) => reject(err));
});
