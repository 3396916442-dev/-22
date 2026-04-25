package main

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// UserService 定义用户服务的接口
type UserService interface {
	Register(username, password string) error
	Login(username, password string) (*User, error)
	GetAllUsers() ([]User, error)
	GetInactiveUsers() ([]User, error)
	DeleteUser(id uint) error
	UpdateUser(id uint, updates map[string]interface{}) error
	GetAccessStats() (map[string]int, error)
}

// UserServiceImpl 实现UserService接口
type UserServiceImpl struct {
	db *gorm.DB
}

// NewUserService 创建UserService实例
func NewUserService(db *gorm.DB) UserService {
	return &UserServiceImpl{db: db}
}

// Register 注册用户
func (s *UserServiceImpl) Register(username, password string) error {
	var existingUser User
	if err := s.db.Where("username = ?", username).First(&existingUser).Error; err == nil {
		return errors.New("用户名已存在")
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	newUser := User{
		Username:        username,
		Password:        password,
		Role:            "user",
		PermissionLevel: "user",
	}
	return s.db.Create(&newUser).Error
}

// Login 用户登录
func (s *UserServiceImpl) Login(username, password string) (*User, error) {
	var user User
	if err := s.db.Where("username = ? AND password = ?", username, password).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	now := time.Now()
	user.LastLoginAt = &now
	s.db.Model(&user).Update("last_login_at", now)

	return &user, nil
}

// GetAllUsers 获取所有用户
func (s *UserServiceImpl) GetAllUsers() ([]User, error) {
	var users []User
	err := s.db.Find(&users).Error
	return users, err
}

// GetInactiveUsers 获取未登录用户
func (s *UserServiceImpl) GetInactiveUsers() ([]User, error) {
	var users []User
	err := s.db.Where("last_login_at IS NULL").Find(&users).Error
	if err != nil {
		return nil, err
	}
	// 过滤admin
	filtered := []User{}
	for _, u := range users {
		if u.Username != "admin" {
			filtered = append(filtered, u)
		}
	}
	return filtered, nil
}

// DeleteUser 删除用户
func (s *UserServiceImpl) DeleteUser(id uint) error {
	return s.db.Delete(&User{}, id).Error
}

// UpdateUser 更新用户
func (s *UserServiceImpl) UpdateUser(id uint, updates map[string]interface{}) error {
	return s.db.Model(&User{}).Where("id = ?", id).Updates(updates).Error
}

// GetAccessStats 获取访问统计（示例）
func (s *UserServiceImpl) GetAccessStats() (map[string]int, error) {
	var totalUsers int64
	var activeUsers int64
	s.db.Model(&User{}).Count(&totalUsers)
	s.db.Model(&User{}).Where("last_login_at IS NOT NULL").Count(&activeUsers)

	return map[string]int{
		"total_users":    int(totalUsers),
		"active_users":   int(activeUsers),
		"inactive_users": int(totalUsers - activeUsers),
	}, nil
}
