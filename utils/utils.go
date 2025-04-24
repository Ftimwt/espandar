package utils

import (
	"regexp"
)

// ValidatePhone بررسی می‌کند که شماره تلفن ۱۱ رقمی و با 09 شروع شود
func ValidatePhone(phone string) bool {
	matched, _ := regexp.MatchString(`^09[0-9]{9}$`, phone)
	return matched && len(phone) == 11
}
