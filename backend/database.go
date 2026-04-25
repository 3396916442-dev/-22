package main

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type User struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	Username        string     `gorm:"size:32;not null;uniqueIndex" json:"username"`
	Password        string     `gorm:"size:128;not null" json:"-"`
	Role            string     `gorm:"size:16;not null;default:'user'" json:"role"`
	PermissionLevel string     `gorm:"size:16;default:'user'" json:"permission_level"`
	LastLoginAt     *time.Time `gorm:"index" json:"last_login_at"` // 最后登录时间，NULL表示从未登录
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type AccessLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Action    string    `gorm:"size:64;not null" json:"action"`
	IP        string    `gorm:"size:32;not null" json:"ip"`
	CreatedAt time.Time `json:"created_at"`
}

var db *gorm.DB

func initDB() {
	// 请替换为你的 MySQL 密码
	dsn := "root:root0000@tcp(127.0.0.1:3306)/planecommunity?charset=utf8mb4&parseTime=True&loc=Local"
	var err error
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ 数据库连接失败: %v", err)
	}
	log.Println("✅ 数据库连接成功")

	// 自动迁移会自动添加新字段 LastLoginAt
	err = db.AutoMigrate(&User{}, &AccessLog{}, &ApplicationRequest{})
	if err != nil {
		log.Fatalf("❌ 表结构迁移失败: %v", err)
	}
	log.Println("✅ 表结构迁移完成")

	var admin User
	err = db.Where("username = ?", "admin").First(&admin).Error
	if err == gorm.ErrRecordNotFound {
		admin = User{
			Username:        "admin",
			Password:        "admin123",
			Role:            "admin",
			PermissionLevel: "level1",
		}
		err = db.Create(&admin).Error
		if err != nil {
			log.Fatalf("❌ 管理员账号创建失败: %v", err)
		}
		log.Println("✅ 超级管理员初始化成功: admin / admin123")
	} else {
		log.Println("✅ 超级管理员账号已存在")
	}
}
