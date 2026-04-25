package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	if err := loadDotEnv(".env"); err != nil {
		log.Printf("⚠️ 未加载到 .env：%v", err)
	}

	initDB()
	log.Println("✅ 数据库初始化完成")

	// 初始化服务
	userService := NewUserService(db)
	emailCodeService := NewEmailCodeServiceFromEnv()
	requestService := NewApplicationRequestService(db)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-User-Role", "X-User-Name", "X-User-Permission"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 支持分离前端：从环境读取用户端与后台管理端 URL，并把根和 /admin 重定向到对应站点。
	userFrontend := os.Getenv("USER_FRONTEND_URL")
	if userFrontend == "" {
		userFrontend = "http://localhost:3000"
	}
	adminFrontend := os.Getenv("ADMIN_FRONTEND_URL")
	if adminFrontend == "" {
		adminFrontend = userFrontend + "/admin"
	}

	// 根路由重定向到用户前端
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, userFrontend)
	})
	// 管理端入口重定向到管理前端
	r.GET("/admin", func(c *gin.Context) {
		c.Redirect(http.StatusFound, adminFrontend)
	})
	r.GET("/admin/*any", func(c *gin.Context) {
		c.Redirect(http.StatusFound, adminFrontend)
	})

	api := r.Group("/api")
	{
		api.POST("/send-register-code", func(c *gin.Context) { SendRegisterCodeHandler(c, emailCodeService) })
		api.POST("/register", func(c *gin.Context) { RegisterHandler(c, userService, emailCodeService) })
		api.POST("/login", func(c *gin.Context) { LoginHandler(c, userService) })
		api.POST("/applications/admin", func(c *gin.Context) { SubmitAdminApplicationHandler(c, requestService) })
		api.POST("/applications/group", func(c *gin.Context) { SubmitGroupApplicationHandler(c, requestService) })
		api.GET("/applications/me", func(c *gin.Context) { GetMyApplicationsHandler(c, requestService) })
	}

	admin := r.Group("/api/admin")
	{
		admin.GET("/users", func(c *gin.Context) { GetAllUsersHandler(c, userService) })
		admin.GET("/inactive-users", func(c *gin.Context) { GetInactiveUsersHandler(c, userService) })
		admin.DELETE("/users/:id", func(c *gin.Context) { DeleteUserHandler(c, userService) })
		admin.PUT("/users/:id", func(c *gin.Context) { UpdateUserHandler(c, userService) })
		admin.GET("/stats", func(c *gin.Context) { GetAccessStatsHandler(c, userService) })
		admin.GET("/applications", func(c *gin.Context) { GetAdminApplicationsHandler(c, requestService) })
		admin.GET("/applications/search", func(c *gin.Context) { SearchApplicationsHandler(c, requestService) })
		admin.GET("/applications/summary", func(c *gin.Context) { GetApplicationSummaryHandler(c, requestService) })
		admin.POST("/applications/:id/approve", func(c *gin.Context) { ApproveApplicationHandler(c, requestService) })
		admin.POST("/applications/:id/reject", func(c *gin.Context) { RejectApplicationHandler(c, requestService) })
	}

	r.Static("/static", "./static")

	log.Println("🚀 服务启动成功: http://localhost:8080")
	log.Println("🔑 超级管理员账号: admin / admin123")
	if err := r.Run(":8080"); err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ 服务启动失败: %v", err)

	}
}
