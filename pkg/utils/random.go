package utils

import "crypto/rand"

const charset = "abcdefghijklmnopqrstuvwxyz0123456789"

func GenerateRandomString(length int) string {
	b := make([]byte, length)
	for i := range b {
		randomByte := make([]byte, 1)
		if _, err := rand.Read(randomByte); err != nil {
			panic(err)
		}
		b[i] = charset[int(randomByte[0])%len(charset)]
	}
	return string(b)
}
