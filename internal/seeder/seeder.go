package seeder

import (
	"fleetify/internal/model"
	"log"

	"gorm.io/gorm"
)

func Run(db *gorm.DB) {
	// Auto-migrate tables
	if err := db.AutoMigrate(
		&model.User{},
		&model.Vehicle{},
		&model.MasterItem{},
		&model.MaintenanceReport{},
		&model.ReportItem{},
	); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	// Seed Users
	users := []model.User{
		{Username: "budi_sa", Role: "SA"},
		{Username: "siti_sa", Role: "SA"},
		{Username: "andi_approval", Role: "APPROVAL"},
	}
	for _, u := range users {
		db.Where(model.User{Username: u.Username}).FirstOrCreate(&u)
	}

	// Seed Vehicles
	vehicles := []model.Vehicle{
		{LicensePlate: "B 1234 ABC", Model: "Toyota Avanza 2022"},
		{LicensePlate: "D 5678 XYZ", Model: "Mitsubishi L300 2021"},
		{LicensePlate: "F 9012 DEF", Model: "Isuzu ELF 2020"},
	}
	for _, v := range vehicles {
		db.Where(model.Vehicle{LicensePlate: v.LicensePlate}).FirstOrCreate(&v)
	}

	// Seed MasterItems
	items := []model.MasterItem{
		{ItemName: "Oli Mesin 4L", Type: "PART", Price: 85000},
		{ItemName: "Filter Oli", Type: "PART", Price: 35000},
		{ItemName: "Kampas Rem Depan", Type: "PART", Price: 150000},
		{ItemName: "Jasa Ganti Oli", Type: "SERVICE", Price: 50000},
		{ItemName: "Jasa Servis AC", Type: "SERVICE", Price: 200000},
	}
	for _, it := range items {
		db.Where(model.MasterItem{ItemName: it.ItemName}).FirstOrCreate(&it)
	}

	log.Println("[seeder] data seeded successfully")
}
