import CryptoJS from 'crypto-js';

const AES_KEY = 'this_is_a_32_byte_long_key_1234!';

export const decryptMessage = (encryptedContent) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, AES_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || encryptedContent;
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedContent;
  }
};