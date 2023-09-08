import axios from 'axios';
import globalContext from '../context';

const http = axios;

http.defaults.timeout = 10000;
http.defaults.baseURL = globalContext.backendUrl;
http.defaults.withCredentials = true;

http.interceptors.response.use(res => res.data, err => {
  // 401 redirect to log in
  if (err.response.status === 401) {
    window.location.href = globalContext.ovincWebUrl + "/login/?next=" + window.location.href
    return
  }
  return Promise.reject(err);
});

export default http;
