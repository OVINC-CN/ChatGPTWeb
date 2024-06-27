import {getTCaptchaConfigAPI} from '@/api/tcaptcha';
import {tCaptchaLocale} from '@/locale';

export const checkTCaptcha = (callback) => {
  getTCaptchaConfigAPI().then(
      (res) => {
        const captchaConfig = res.data;
        if (captchaConfig.is_enabled) {
          try {
          // eslint-disable-next-line no-undef
            const tCaptchaClient = new TencentCaptcha(String(captchaConfig.app_id), callback, {
              aidEncrypted: captchaConfig.aid_encrypted,
              userLanguage: tCaptchaLocale,
            });
            tCaptchaClient.show();
          } catch (e) {
            callback({ret: -1, message: String(e)});
          }
        } else {
          callback({ret: 0});
        }
      },
      () => callback({ret: -1}),
  );
};
