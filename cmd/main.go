package main

import (
	"fleetify/internal/handler"
	"fleetify/internal/middleware"
	"fleetify/internal/repository"
	"fleetify/internal/seeder"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load()

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		getEnv("DB_USER", "fleetify"),
		getEnv("DB_PASSWORD", "fleetify123"),
		getEnv("DB_HOST", "db"),
		getEnv("DB_PORT", "3306"),
		getEnv("DB_NAME", "fleetify_db"),
	)

	// Retry connecting (MySQL may still be starting)
	var db *gorm.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("waiting for db... (%d/10)", i+1)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Run migrations + seed
	seeder.Run(db)

	// Repositories
	userRepo := repository.NewUserRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	itemRepo := repository.NewMasterItemRepository(db)
	reportRepo := repository.NewReportRepository(db)

	app := fiber.New(fiber.Config{
		BodyLimit: 20 * 1024 * 1024, // 20 MB
	})

	app.Use(cors.New())
	app.Use(logger.New())

	// Serve uploaded files and frontend
	app.Static("/uploads", "./uploads")
	app.Static("/", "./frontend")

	api := app.Group("/api", middleware.Auth(userRepo))

	// Master data
	api.Get("/users", handler.GetUsers(userRepo))
	api.Get("/vehicles", handler.GetVehicles(vehicleRepo))
	api.Get("/master-items", handler.GetMasterItems(itemRepo))

	// Reports
	api.Get("/reports", handler.GetReports(reportRepo))
	api.Get("/reports/:id", handler.GetReportByID(reportRepo))
	api.Post("/reports",
		middleware.RequireRole("SA"),
		handler.CreateReport(reportRepo, itemRepo),
	)
	api.Patch("/reports/:id/approve",
		middleware.RequireRole("APPROVAL"),
		handler.ApproveReport(reportRepo),
	)
	api.Patch("/reports/:id/complete",
		middleware.RequireRole("SA"),
		handler.CompleteReport(reportRepo),
	)

	port := getEnv("APP_PORT", "8080")
	log.Printf("🚀 Fleetify running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
