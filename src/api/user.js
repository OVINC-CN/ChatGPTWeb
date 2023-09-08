import http from './index';
import globalContext from "../context";

export const getUserInfoAPI = () => new Promise((resolve, reject) => {
  http.get(`${globalContext.ovincUrl}/account/user_info/`).then(res => resolve(res), err => reject(err));
});

export const listUserPropertyAPI = () => new Promise((resolve, reject) => {
  http.get(`${globalContext.ovincUrl}/account/user_property/`).then(res => resolve(res), err => reject(err));
});

export const signOutAPI = () => new Promise((resolve, reject) => {
  http.get(`${globalContext.ovincUrl}/account/sign_out/`).then(res => resolve(res), err => reject(err));
});

export const savePropertyAPI = properties => new Promise((resolve, reject) => {
  http.post(`${globalContext.ovincUrl}/account/user_property/`, properties).then(res => resolve(res), err => reject(err));
});

export const searchUserAPI = keyword => new Promise((resolve, reject) => {
  http.get(`${globalContext.ovincUrl}/account/user_search/?keyword=${keyword}`).then(res => resolve(res), err => reject(err));
});
