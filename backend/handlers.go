package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func SendRegisterCodeHandler(c *gin.Context, emailCodeService EmailCodeService) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Website  string `json:"website"`
		Nickname string `json:"nickname"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	if hasHoneypotValue(req.Website, req.Nickname) {
		c.JSON(http.StatusForbidden, gin.H{"error": "请求被拦截"})
		return
	}

	if err := emailCodeService.SendCode(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "验证码已发送，请查收邮箱"})
}

func RegisterHandler(c *gin.Context, userService UserService, emailCodeService EmailCodeService) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
		Email    string `json:"email" binding:"required,email"`
		Code     string `json:"code" binding:"required,len=6"`
		Website  string `json:"website"`
		Nickname string `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	if hasHoneypotValue(req.Website, req.Nickname) {
		c.JSON(http.StatusForbidden, gin.H{"error": "请求被拦截"})
		return
	}

	if !emailCodeService.VerifyCode(req.Email, req.Code) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "验证码错误、过期或尝试次数过多"})
		return
	}

	if err := userService.Register(req.Username, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "注册成功"})
}

func hasHoneypotValue(values ...string) bool {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return true
		}
	}
	return false
}

func SubmitAdminApplicationHandler(c *gin.Context, requestService ApplicationRequestService) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	if err := requestService.SubmitAdminApplication(req.Username, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "管理员申请已提交"})
}

func SubmitGroupApplicationHandler(c *gin.Context, requestService ApplicationRequestService) {
	var req struct {
		Username  string `json:"username" binding:"required"`
		GroupName string `json:"group_name" binding:"required"`
		Purpose   string `json:"purpose" binding:"required"`
		Members   string `json:"members" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	if err := requestService.SubmitGroupApplication(req.Username, req.GroupName, req.Purpose, req.Members); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "组建飞机讨论小组申请已提交"})
}

func GetMyApplicationsHandler(c *gin.Context, requestService ApplicationRequestService) {
	username := c.Query("username")
	requests, err := requestService.ListMyRequests(username)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

func GetAdminApplicationsHandler(c *gin.Context, requestService ApplicationRequestService) {
	if !canReviewApplications(c.GetHeader("X-User-Role")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}
	filterType := c.Query("type")
	status := c.Query("status")
	requests, err := requestService.ListRequests(filterType, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

func ApproveApplicationHandler(c *gin.Context, requestService ApplicationRequestService) {
	if !canReviewApplications(c.GetHeader("X-User-Role")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}
	var req struct {
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "申请ID格式错误"})
		return
	}
	reviewer := c.GetHeader("X-User-Name")
	if reviewer == "" {
		reviewer = c.GetHeader("X-User-Role")
	}
	if err := requestService.ReviewRequest(id, true, reviewer, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "申请已通过"})
}

func RejectApplicationHandler(c *gin.Context, requestService ApplicationRequestService) {
	if !canReviewApplications(c.GetHeader("X-User-Role")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}
	var req struct {
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "申请ID格式错误"})
		return
	}
	reviewer := c.GetHeader("X-User-Name")
	if reviewer == "" {
		reviewer = c.GetHeader("X-User-Role")
	}
	if err := requestService.ReviewRequest(id, false, reviewer, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "申请已拒绝"})
}

func SearchApplicationsHandler(c *gin.Context, requestService ApplicationRequestService) {
	if !canReviewApplications(c.GetHeader("X-User-Role")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}

	var startAt *time.Time
	if v := c.Query("start_at"); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "start_at 格式应为 YYYY-MM-DD"})
			return
		}
		startAt = &parsed
	}

	var endAt *time.Time
	if v := c.Query("end_at"); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "end_at 格式应为 YYYY-MM-DD"})
			return
		}
		endAt = &parsed
	}

	page := 1
	if v := c.Query("page"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &page); err != nil || page < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "page 必须是正整数"})
			return
		}
	}

	pageSize := 10
	if v := c.Query("page_size"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &pageSize); err != nil || pageSize < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "page_size 必须是正整数"})
			return
		}
	}

	result, err := requestService.SearchRequests(ApplicationRequestSearchFilter{
		RequestType: c.Query("type"),
		Status:      c.Query("status"),
		Username:    c.Query("username"),
		Keyword:     c.Query("keyword"),
		StartAt:     startAt,
		EndAt:       endAt,
		Page:        page,
		PageSize:    pageSize,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func GetApplicationSummaryHandler(c *gin.Context, requestService ApplicationRequestService) {
	if !canReviewApplications(c.GetHeader("X-User-Role")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}

	summary, err := requestService.GetRequestSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func canReviewApplications(role string) bool {
	return role == "admin" || role == "manager"
}

func LoginHandler(c *gin.Context, userService UserService) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	user, err := userService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "登录成功",
		"role":       user.Role,
		"username":   user.Username,
		"permission": user.PermissionLevel,
	})
}

func GetAllUsersHandler(c *gin.Context, userService UserService) {
	users, err := userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户失败：" + err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func GetInactiveUsersHandler(c *gin.Context, userService UserService) {
	users, err := userService.GetInactiveUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败：" + err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func DeleteUserHandler(c *gin.Context, userService UserService) {
	userRole := c.GetHeader("X-User-Role")
	if userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "无删除权限，仅超级管理员可删除用户"})
		return
	}

	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户ID格式错误"})
		return
	}

	if err := userService.DeleteUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

func UpdateUserHandler(c *gin.Context, userService UserService) {
	operatorRole := c.GetHeader("X-User-Role")

	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户ID格式错误"})
		return
	}

	var req struct {
		Username        string `json:"username"`
		Role            string `json:"role"`
		PermissionLevel string `json:"permission_level"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误：" + err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.PermissionLevel != "" {
		updates["permission_level"] = req.PermissionLevel
	}

	// 权限检查逻辑（简化版）
	if operatorRole != "admin" && operatorRole != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "无修改权限"})
		return
	}

	if err := userService.UpdateUser(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "修改成功"})
}

func GetAccessStatsHandler(c *gin.Context, userService UserService) {
	stats, err := userService.GetAccessStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}
