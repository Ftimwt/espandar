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
    if (!encryptedContent) return '';
    const bytes = CryptoJS.AES.decrypt(encryptedContent, AES_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || encryptedContent;
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedContent;
  }
};