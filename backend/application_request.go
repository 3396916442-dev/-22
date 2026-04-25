package main

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	RequestTypeAdminApplication = "admin_application"
	RequestTypeGroupApplication = "group_application"
	RequestStatusPending        = "pending"
	RequestStatusApproved       = "approved"
	RequestStatusRejected       = "rejected"
)

type ApplicationRequest struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	RequestType       string     `gorm:"size:32;not null;index" json:"request_type"`
	ApplicantUsername string     `gorm:"size:32;not null;index" json:"applicant_username"`
	Reason            string     `gorm:"type:text" json:"reason,omitempty"`
	GroupName         string     `gorm:"size:64;index" json:"group_name,omitempty"`
	Purpose           string     `gorm:"type:text" json:"purpose,omitempty"`
	Members           string     `gorm:"type:text" json:"members,omitempty"`
	Status            string     `gorm:"size:16;not null;default:'pending';index" json:"status"`
	Reviewer          string     `gorm:"size:32" json:"reviewer,omitempty"`
	ReviewComment     string     `gorm:"type:text" json:"review_comment,omitempty"`
	ReviewedAt        *time.Time `json:"reviewed_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type ApplicationRequestService interface {
	SubmitAdminApplication(applicantUsername, reason string) error
	SubmitGroupApplication(applicantUsername, groupName, purpose, members string) error
	ListRequests(filterType, status string) ([]ApplicationRequest, error)
	ListMyRequests(applicantUsername string) ([]ApplicationRequest, error)
	ReviewRequest(id uint, approve bool, reviewer, comment string) error
	SearchRequests(filter ApplicationRequestSearchFilter) (*ApplicationRequestSearchResult, error)
	GetRequestSummary() (map[string]int64, error)
}

type ApplicationRequestSearchFilter struct {
	RequestType string
	Status      string
	Username    string
	Keyword     string
	StartAt     *time.Time
	EndAt       *time.Time
	Page        int
	PageSize    int
}

type ApplicationRequestSearchResult struct {
	Items      []ApplicationRequest `json:"items"`
	Total      int64                `json:"total"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"page_size"`
	TotalPages int                  `json:"total_pages"`
}

type ApplicationRequestServiceImpl struct {
	db *gorm.DB
}

func NewApplicationRequestService(db *gorm.DB) ApplicationRequestService {
	return &ApplicationRequestServiceImpl{db: db}
}

func (s *ApplicationRequestServiceImpl) SubmitAdminApplication(applicantUsername, reason string) error {
	applicantUsername = strings.TrimSpace(applicantUsername)
	if applicantUsername == "" {
		return errors.New("申请人不能为空")
	}
	if err := s.ensureUserExists(applicantUsername); err != nil {
		return err
	}
	if reason = strings.TrimSpace(reason); reason == "" {
		reason = "希望申请成为管理员"
	}
	if err := s.hasPendingRequest(applicantUsername, RequestTypeAdminApplication, ""); err != nil {
		return err
	}
	request := ApplicationRequest{
		RequestType:       RequestTypeAdminApplication,
		ApplicantUsername: applicantUsername,
		Reason:            reason,
		Status:            RequestStatusPending,
	}
	return s.db.Create(&request).Error
}

func (s *ApplicationRequestServiceImpl) SubmitGroupApplication(applicantUsername, groupName, purpose, members string) error {
	applicantUsername = strings.TrimSpace(applicantUsername)
	groupName = strings.TrimSpace(groupName)
	purpose = strings.TrimSpace(purpose)
	members = strings.TrimSpace(members)
	if applicantUsername == "" {
		return errors.New("申请人不能为空")
	}
	if groupName == "" || purpose == "" || members == "" {
		return errors.New("请填写小组名字、用途和成员")
	}
	if err := s.ensureUserExists(applicantUsername); err != nil {
		return err
	}
	if err := s.hasPendingRequest(applicantUsername, RequestTypeGroupApplication, groupName); err != nil {
		return err
	}
	request := ApplicationRequest{
		RequestType:       RequestTypeGroupApplication,
		ApplicantUsername: applicantUsername,
		GroupName:         groupName,
		Purpose:           purpose,
		Members:           members,
		Status:            RequestStatusPending,
	}
	return s.db.Create(&request).Error
}

func (s *ApplicationRequestServiceImpl) ListRequests(filterType, status string) ([]ApplicationRequest, error) {
	var requests []ApplicationRequest
	query := s.db.Order("created_at DESC")
	if filterType != "" {
		query = query.Where("request_type = ?", filterType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&requests).Error; err != nil {
		return nil, err
	}
	return requests, nil
}

func (s *ApplicationRequestServiceImpl) ListMyRequests(applicantUsername string) ([]ApplicationRequest, error) {
	applicantUsername = strings.TrimSpace(applicantUsername)
	if applicantUsername == "" {
		return nil, errors.New("申请人不能为空")
	}
	var requests []ApplicationRequest
	if err := s.db.Where("applicant_username = ?", applicantUsername).Order("created_at DESC").Find(&requests).Error; err != nil {
		return nil, err
	}
	return requests, nil
}

func (s *ApplicationRequestServiceImpl) ReviewRequest(id uint, approve bool, reviewer, comment string) error {
	reviewer = strings.TrimSpace(reviewer)
	if reviewer == "" {
		return errors.New("审核人不能为空")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		var request ApplicationRequest
		if err := tx.First(&request, id).Error; err != nil {
			return err
		}
		if request.Status != RequestStatusPending {
			return errors.New("该申请已处理")
		}

		status := RequestStatusRejected
		if approve {
			status = RequestStatusApproved
		}
		now := time.Now()
		request.Status = status
		request.Reviewer = reviewer
		request.ReviewComment = strings.TrimSpace(comment)
		request.ReviewedAt = &now
		if err := tx.Save(&request).Error; err != nil {
			return err
		}

		if approve && request.RequestType == RequestTypeAdminApplication {
			if err := tx.Model(&User{}).
				Where("username = ?", request.ApplicantUsername).
				Updates(map[string]interface{}{"role": "manager", "permission_level": "level1"}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *ApplicationRequestServiceImpl) SearchRequests(filter ApplicationRequestSearchFilter) (*ApplicationRequestSearchResult, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	query := s.db.Model(&ApplicationRequest{})
	if filter.RequestType != "" {
		query = query.Where("request_type = ?", filter.RequestType)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Username != "" {
		query = query.Where("applicant_username = ?", filter.Username)
	}
	if filter.Keyword != "" {
		kw := "%" + strings.TrimSpace(filter.Keyword) + "%"
		query = query.Where(
			"applicant_username LIKE ? OR reason LIKE ? OR group_name LIKE ? OR purpose LIKE ? OR members LIKE ?",
			kw, kw, kw, kw, kw,
		)
	}
	if filter.StartAt != nil {
		query = query.Where("created_at >= ?", *filter.StartAt)
	}
	if filter.EndAt != nil {
		query = query.Where("created_at <= ?", *filter.EndAt)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var items []ApplicationRequest
	if err := query.
		Order("created_at DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return nil, err
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &ApplicationRequestSearchResult{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *ApplicationRequestServiceImpl) GetRequestSummary() (map[string]int64, error) {
	var rows []struct {
		Status string
		Count  int64
	}
	if err := s.db.Model(&ApplicationRequest{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	summary := map[string]int64{
		"pending":  0,
		"approved": 0,
		"rejected": 0,
	}
	for _, row := range rows {
		summary[row.Status] = row.Count
	}
	return summary, nil
}

func (s *ApplicationRequestServiceImpl) ensureUserExists(username string) error {
	var user User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("用户不存在：%s", username)
		}
		return err
	}
	return nil
}

func (s *ApplicationRequestServiceImpl) hasPendingRequest(username, requestType, groupName string) error {
	query := s.db.Where("applicant_username = ? AND request_type = ? AND status = ?", username, requestType, RequestStatusPending)
	if requestType == RequestTypeGroupApplication && groupName != "" {
		query = query.Where("group_name = ?", groupName)
	}
	var count int64
	if err := query.Model(&ApplicationRequest{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("你已经有待审核的申请，请等待处理")
	}
	return nil
}
