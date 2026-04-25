# 后端说明

这是飞机讨论社区项目的 Go 后端，负责用户登录注册、邮箱验证码、管理员申请、用户管理和申请审核等接口。

## 技术栈

- Go
- Gin
- GORM
- MySQL
- SMTP 邮件发送（QQ 邮箱）

## 目录结构

- `main.go`：服务入口，负责路由注册、CORS 和启动 HTTP 服务。
- `handlers.go`：所有接口处理函数。
- `service.go`：用户与业务服务实现。
- `database.go`：数据库连接、初始化和迁移。
- `application_request.go`：申请表相关模型与服务。
- `email_code.go`：邮箱验证码生成、发送与校验。
- `env.go`：读取 `.env` 文件。
- `.env`：本地环境变量配置。

## 运行前准备

请先确认本机已安装并启动以下依赖：

- Go 1.26.1 或兼容版本
- MySQL 数据库
- 可用的 QQ 邮箱 SMTP 授权码

## 环境变量

后端默认从 `backend/.env` 读取配置。示例：

```env
# 数据库
DB_USER=root
DB_PASSWORD=123456
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=plane

# SMTP 配置（QQ 邮箱）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SENDER_EMAIL=your@qq.com
SMTP_AUTH_CODE=your_smtp_auth_code

# 前端地址（可选）
USER_FRONTEND_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://localhost:3000/admin
```

## 启动方式

进入后端目录后执行：

```bash
cd backend
go run .
```

如果你使用 `just`，也可以在 `backend/` 目录下执行对应命令。

## 常用接口

- `POST /api/send-register-code`：发送注册验证码
- `POST /api/register`：用户注册
- `POST /api/login`：用户登录
- `POST /api/applications/admin`：提交管理员申请
- `POST /api/applications/group`：提交讨论小组申请
- `GET /api/applications/me`：查看我的申请
- `GET /api/admin/users`：获取用户列表
- `GET /api/admin/applications`：获取申请列表
- `POST /api/admin/applications/:id/approve`：通过申请
- `POST /api/admin/applications/:id/reject`：拒绝申请

## 说明

- 代码当前采用本地内存验证码缓存，服务重启后验证码会失效。
- CORS 已允许前端管理端和用户端常用请求头。
- 如果前后端分离运行，请确保前端地址与环境变量保持一致。
