import CryptoJS from 'crypto-js';

const AES_KEY = 'this_is_a_32_byte_long_key_1234!';

export const encryptMessage = (content) => {
  try {
    if (!content) return '';
    return CryptoJS.AES.encrypt(content, AES_KEY).toString();
  } catch (err) {
    console.error('Encryption error:', err);
    return content;
  }
};

export const decryptMessage = (encryptedContent) => {
  try {
    if (!encryptedContent) {
      console.warn('decryptMessage: Empty content');
      return '';
    }
    const bytes = CryptoJS.AES.decrypt(encryptedContent, AES_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      console.warn('decryptMessage: Decryption returned empty string for content:', encryptedContent);
      return encryptedContent;
    }
    return decrypted;
  } catch (err) {
    console.error('decryptMessage: Decryption error:', err, 'Content:', encryptedContent);
    return encryptedContent;
  }
};