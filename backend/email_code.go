package main

import (
	"crypto/rand"
	"fmt"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

type EmailCodeService interface {
	SendCode(email string) error
	VerifyCode(email, code string) bool
}

type emailCodeEntry struct {
	code      string
	expiresAt time.Time
	lastSent  time.Time
	tries     int
}

type SMTPEmailCodeService struct {
	mu      sync.Mutex
	codes   map[string]emailCodeEntry
	host    string
	port    string
	sender  string
	authPwd string
}

var qqEmailRegex = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@qq\.com$`)

func NewEmailCodeServiceFromEnv() EmailCodeService {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		host = "smtp.qq.com"
	}

	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}

	return &SMTPEmailCodeService{
		codes:   make(map[string]emailCodeEntry),
		host:    host,
		port:    port,
		sender:  os.Getenv("SMTP_SENDER_EMAIL"),
		authPwd: os.Getenv("SMTP_AUTH_CODE"),
	}
}

func (s *SMTPEmailCodeService) SendCode(email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if !qqEmailRegex.MatchString(email) {
		return fmt.Errorf("请填写有效的QQ邮箱")
	}

	if s.sender == "" || s.authPwd == "" {
		return fmt.Errorf("邮件服务未配置，请设置SMTP_SENDER_EMAIL和SMTP_AUTH_CODE")
	}

	now := time.Now()
	s.mu.Lock()
	if entry, ok := s.codes[email]; ok && now.Sub(entry.lastSent) < 60*time.Second {
		left := 60 - int(now.Sub(entry.lastSent).Seconds())
		s.mu.Unlock()
		return fmt.Errorf("发送过于频繁，请%d秒后再试", left)
	}

	code, err := generate6DigitCode()
	if err != nil {
		s.mu.Unlock()
		return fmt.Errorf("生成验证码失败")
	}

	s.codes[email] = emailCodeEntry{
		code:      code,
		expiresAt: now.Add(5 * time.Minute),
		lastSent:  now,
		tries:     0,
	}
	s.mu.Unlock()

	if err := s.sendEmail(email, code); err != nil {
		return fmt.Errorf("验证码发送失败：%v", err)
	}

	return nil
}

func (s *SMTPEmailCodeService) VerifyCode(email, code string) bool {
	email = strings.TrimSpace(strings.ToLower(email))
	code = strings.TrimSpace(code)

	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.codes[email]
	if !ok {
		return false
	}

	if time.Now().After(entry.expiresAt) {
		delete(s.codes, email)
		return false
	}

	if entry.tries >= 5 {
		delete(s.codes, email)
		return false
	}

	if entry.code != code {
		entry.tries++
		s.codes[email] = entry
		return false
	}

	delete(s.codes, email)
	return true
}

func (s *SMTPEmailCodeService) sendEmail(to, code string) error {
	auth := smtp.PlainAuth("", s.sender, s.authPwd, s.host)
	addr := fmt.Sprintf("%s:%s", s.host, s.port)

	msg := strings.Join([]string{
		fmt.Sprintf("From: 飞机爱好者社区 <%s>", s.sender),
		fmt.Sprintf("To: %s", to),
		"Subject: 飞机爱好者社区注册验证码",
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		fmt.Sprintf("您的注册验证码是：%s", code),
		"验证码 5 分钟内有效，请勿泄露给他人。",
	}, "\r\n")

	return smtp.SendMail(addr, auth, s.sender, []string{to}, []byte(msg))
}

func generate6DigitCode() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = '0' + (b[i] % 10)
	}
	return string(b), nil
}
