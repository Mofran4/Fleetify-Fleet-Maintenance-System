package model

import "time"

type User struct {
	ID       uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Username string `gorm:"type:varchar(100);not null;unique" json:"username"`
	Role     string `gorm:"type:enum('SA','APPROVAL');not null" json:"role"`
}

type Vehicle struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	LicensePlate string `gorm:"type:varchar(20);not null;unique" json:"license_plate"`
	Model        string `gorm:"type:varchar(100);not null" json:"model"`
}

type MasterItem struct {
	ID       uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemName string  `gorm:"type:varchar(150);not null" json:"item_name"`
	Type     string  `gorm:"type:enum('PART','SERVICE');not null" json:"type"`
	Price    float64 `gorm:"type:decimal(15,2);not null" json:"price"`
}

type MaintenanceReport struct {
	ID           uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	VehicleID    uint         `gorm:"not null" json:"vehicle_id"`
	CreatedBy    uint         `gorm:"not null" json:"created_by"`
	Odometer     int          `gorm:"not null" json:"odometer"`
	Complaint    string       `gorm:"type:text;not null" json:"complaint"`
	Status       string       `gorm:"type:enum('PENDING_APPROVAL','APPROVED','COMPLETED');default:'PENDING_APPROVAL'" json:"status"`
	InitialPhoto string       `gorm:"type:varchar(255)" json:"initial_photo"`
	ProofPhoto   string       `gorm:"type:varchar(255)" json:"proof_photo"`
	CreatedAt    time.Time    `json:"created_at"`
	Vehicle      Vehicle      `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`
	Creator      User         `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Items        []ReportItem `gorm:"foreignKey:ReportID" json:"items,omitempty"`
}

type ReportItem struct {
	ID            uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	ReportID      uint        `gorm:"not null" json:"report_id"`
	ItemID        uint        `gorm:"not null" json:"item_id"`
	Quantity      int         `gorm:"not null" json:"quantity"`
	PriceSnapshot float64     `gorm:"type:decimal(15,2);not null" json:"price_snapshot"`
	Item          *MasterItem `gorm:"foreignKey:ItemID" json:"item,omitempty"`
}
