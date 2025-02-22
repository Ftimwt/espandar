package encryption

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

type AESCipher struct {
	Key []byte
}

var fixedkey = []byte("this_is_a_32_byte_long_key_1234!")

func NewAESCipher() *AESCipher {
	return &AESCipher{Key: fixedkey}
}

func pad(src []byte) []byte {
	padding := aes.BlockSize - len(src)%aes.BlockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(src, padtext...)
}

func unpad(src []byte) ([]byte, error) {
	length := len(src)
	if length == 0 {
		return nil, errors.New("invalid padding")
	}
	unpadding := int(src[length-1])
	if unpadding > length {
		return nil, errors.New("invalid padding")
	}
	return src[:length-unpadding], nil
}

func (a *AESCipher) Encrypt(plainText string) (string, error) {
	plainTextBytes := pad([]byte(plainText))

	block, err := aes.NewCipher(a.Key)
	if err != nil {
		return "", err
	}

	cipherText := make([]byte, aes.BlockSize+len(plainTextBytes))
	iv := cipherText[:aes.BlockSize]

	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(cipherText[aes.BlockSize:], plainTextBytes)

	return base64.StdEncoding.EncodeToString(cipherText), nil
}

func (a *AESCipher) Decrypt(cipherTextBase64 string) (string, error) {
	cipherText, err := base64.StdEncoding.DecodeString(cipherTextBase64)
	if err != nil {
		return "", err
	}

	if len(cipherText) < aes.BlockSize {
		return "", errors.New("ciphertext too short")
	}

	iv := cipherText[:aes.BlockSize]
	cipherText = cipherText[aes.BlockSize:]

	block, err := aes.NewCipher(a.Key)
	if err != nil {
		return "", err
	}

	plainText := make([]byte, len(cipherText))
	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(plainText, cipherText)

	unpaddedText, err := unpad(plainText)
	if err != nil {
		return "", err
	}
	return string(unpaddedText), nil
}
