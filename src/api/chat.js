import globalContext from '../context';

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
