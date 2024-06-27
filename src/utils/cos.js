export const loadCOSClient = (credentials) => {
  return new COS({
    getAuthorization: (options, callback) => {
      callback(
          {
            TmpSecretId: credentials.secret_id,
            TmpSecretKey: credentials.secret_key,
            SecurityToken: credentials.token,
            StartTime: credentials.start_time,
            ExpiredTime: credentials.expired_time,
          },
      );
    },
  });
};
