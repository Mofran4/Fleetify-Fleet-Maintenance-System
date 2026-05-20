package repository

import (
	"fleetify/internal/model"

	"gorm.io/gorm"
)

type UserRepository interface {
	FindByID(id uint) (*model.User, error)
	FindAll() ([]model.User, error)
}

type userRepo struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db}
}

func (r *userRepo) FindByID(id uint) (*model.User, error) {
	var user model.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindAll() ([]model.User, error) {
	var users []model.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────

type VehicleRepository interface {
	FindAll() ([]model.Vehicle, error)
	FindByID(id uint) (*model.Vehicle, error)
}

type vehicleRepo struct{ db *gorm.DB }

func NewVehicleRepository(db *gorm.DB) VehicleRepository {
	return &vehicleRepo{db}
}

func (r *vehicleRepo) FindAll() ([]model.Vehicle, error) {
	var vehicles []model.Vehicle
	if err := r.db.Find(&vehicles).Error; err != nil {
		return nil, err
	}
	return vehicles, nil
}

func (r *vehicleRepo) FindByID(id uint) (*model.Vehicle, error) {
	var v model.Vehicle
	if err := r.db.First(&v, id).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

// ─── MasterItem ───────────────────────────────────────────────────────────────

type MasterItemRepository interface {
	FindAll() ([]model.MasterItem, error)
	FindByID(id uint) (*model.MasterItem, error)
}

type masterItemRepo struct{ db *gorm.DB }

func NewMasterItemRepository(db *gorm.DB) MasterItemRepository {
	return &masterItemRepo{db}
}

func (r *masterItemRepo) FindAll() ([]model.MasterItem, error) {
	var items []model.MasterItem
	if err := r.db.Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *masterItemRepo) FindByID(id uint) (*model.MasterItem, error) {
	var item model.MasterItem
	if err := r.db.First(&item, id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}
