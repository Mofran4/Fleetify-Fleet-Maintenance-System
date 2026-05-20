package repository

import (
	"fleetify/internal/model"

	"gorm.io/gorm"
)

type ReportRepository interface {
	CreateWithItems(report *model.MaintenanceReport, items []model.ReportItem) error
	FindAll() ([]model.MaintenanceReport, error)
	FindByID(id uint) (*model.MaintenanceReport, error)
	UpdateStatus(id uint, status string) error
	UpdateProofPhoto(id uint, proofPhoto string) error
}

type reportRepo struct{ db *gorm.DB }

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepo{db}
}

// CreateWithItems saves header + detail in one atomic transaction.
func (r *reportRepo) CreateWithItems(report *model.MaintenanceReport, items []model.ReportItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(report).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].ReportID = report.ID
		}
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *reportRepo) FindAll() ([]model.MaintenanceReport, error) {
	var reports []model.MaintenanceReport
	err := r.db.
		Preload("Vehicle").
		Preload("Creator").
		Preload("Items.Item").
		Order("created_at DESC").
		Find(&reports).Error
	return reports, err
}

func (r *reportRepo) FindByID(id uint) (*model.MaintenanceReport, error) {
	var report model.MaintenanceReport
	err := r.db.
		Preload("Vehicle").
		Preload("Creator").
		Preload("Items.Item").
		First(&report, id).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func (r *reportRepo) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.MaintenanceReport{}).
		Where("id = ?", id).
		Update("status", status).Error
}

func (r *reportRepo) UpdateProofPhoto(id uint, proofPhoto string) error {
	return r.db.Model(&model.MaintenanceReport{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"proof_photo": proofPhoto,
			"status":      "COMPLETED",
		}).Error
}
