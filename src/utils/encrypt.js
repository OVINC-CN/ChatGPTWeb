import CryptoJS from 'crypto-js';

export class Encryption {
  constructor(key) {
    if (key.length > 16) {
      throw new Error('Key length cannot exceed 16 characters');
    }
    this.key = this.padKey(key);
  };

  padKey = (key) => {
    const padding = '0'.repeat(16 - key.length);
    return key + padding;
  };

  encrypt = (data) => {
    try {
      const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      const keyWords = CryptoJS.enc.Utf8.parse(this.key);
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(dataStr, keyWords, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  };

  decrypt = (encryptedData) => {
    try {
      const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
      const iv = CryptoJS.lib.WordArray.create(ciphertext.words.slice(0, 4));
      const encrypted = CryptoJS.lib.WordArray.create(ciphertext.words.slice(4));
      const keyWords = CryptoJS.enc.Utf8.parse(this.key);
      const decrypted = CryptoJS.AES.decrypt(
          {ciphertext: encrypted},
          keyWords,
          {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
          },
      );
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  };
}
