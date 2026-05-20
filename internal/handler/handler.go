package handler

import (
	"fleetify/internal/model"
	"fleetify/internal/repository"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ─── Master handlers ─────────────────────────────────────────────────────────

func GetUsers(repo repository.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		users, err := repo.FindAll()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(users)
	}
}

func GetVehicles(repo repository.VehicleRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		vehicles, err := repo.FindAll()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(vehicles)
	}
}

func GetMasterItems(repo repository.MasterItemRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		items, err := repo.FindAll()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(items)
	}
}

// ─── Report handlers ─────────────────────────────────────────────────────────

type reportItemInput struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

type createReportInput struct {
	VehicleID uint              `json:"vehicle_id"`
	Odometer  int               `json:"odometer"`
	Complaint string            `json:"complaint"`
	Items     []reportItemInput `json:"items"`
}

func CreateReport(reportRepo repository.ReportRepository, itemRepo repository.MasterItemRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user").(*model.User)

		// Handle multipart form
		form, err := c.MultipartForm()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid form data"})
		}

		vehicleID := uint(0)
		fmt.Sscan(strings.Join(form.Value["vehicle_id"], ""), &vehicleID)
		odometer := 0
		fmt.Sscan(strings.Join(form.Value["odometer"], ""), &odometer)
		complaint := strings.Join(form.Value["complaint"], "")

		if vehicleID == 0 || odometer == 0 || complaint == "" {
			return c.Status(400).JSON(fiber.Map{"error": "vehicle_id, odometer, and complaint are required"})
		}

		// Save initial photo simulation
		initialPhoto := ""
		if files := form.File["initial_photo"]; len(files) > 0 {
			file := files[0]
			ext := filepath.Ext(file.Filename)
			filename := fmt.Sprintf("initial_%d%s", time.Now().UnixNano(), ext)
			savePath := "./uploads/" + filename
			if err := c.SaveFile(file, savePath); err == nil {
				initialPhoto = "/uploads/" + filename
			}
		}

		report := &model.MaintenanceReport{
			VehicleID:    vehicleID,
			CreatedBy:    user.ID,
			Odometer:     odometer,
			Complaint:    complaint,
			Status:       "PENDING_APPROVAL",
			InitialPhoto: initialPhoto,
			CreatedAt:    time.Now(),
		}

		// Parse items from form
		itemIDs := form.Value["item_ids[]"]
		quantities := form.Value["quantities[]"]
		var reportItems []model.ReportItem
		for i, rawID := range itemIDs {
			var itemID uint
			fmt.Sscan(rawID, &itemID)
			qty := 1
			if i < len(quantities) {
				fmt.Sscan(quantities[i], &qty)
			}
			masterItem, err := itemRepo.FindByID(itemID)
			if err != nil {
				continue
			}
			reportItems = append(reportItems, model.ReportItem{
				ItemID:        itemID,
				Quantity:      qty,
				PriceSnapshot: masterItem.Price,
			})
		}

		if err := reportRepo.CreateWithItems(report, reportItems); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		// Reload full report
		full, _ := reportRepo.FindByID(report.ID)
		return c.Status(201).JSON(full)
	}
}

func GetReports(reportRepo repository.ReportRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		reports, err := reportRepo.FindAll()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(reports)
	}
}

func GetReportByID(reportRepo repository.ReportRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
		}
		report, err := reportRepo.FindByID(uint(id))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "report not found"})
		}
		return c.JSON(report)
	}
}

func ApproveReport(reportRepo repository.ReportRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
		}
		report, err := reportRepo.FindByID(uint(id))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "report not found"})
		}
		if report.Status != "PENDING_APPROVAL" {
			return c.Status(400).JSON(fiber.Map{"error": "only PENDING_APPROVAL reports can be approved"})
		}
		if err := reportRepo.UpdateStatus(uint(id), "APPROVED"); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		triggerWebhook(uint(id), "APPROVED")
		updated, _ := reportRepo.FindByID(uint(id))
		return c.JSON(updated)
	}
}

func CompleteReport(reportRepo repository.ReportRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
		}
		report, err := reportRepo.FindByID(uint(id))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "report not found"})
		}
		if report.Status != "APPROVED" {
			return c.Status(400).JSON(fiber.Map{"error": "only APPROVED reports can be completed"})
		}

		proofPhoto := ""
		file, err := c.FormFile("proof_photo")
		if err == nil {
			ext := filepath.Ext(file.Filename)
			filename := fmt.Sprintf("proof_%d%s", time.Now().UnixNano(), ext)
			savePath := "./uploads/" + filename
			if err := c.SaveFile(file, savePath); err == nil {
				proofPhoto = "/uploads/" + filename
			}
		}

		if err := reportRepo.UpdateProofPhoto(uint(id), proofPhoto); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		triggerWebhook(uint(id), "COMPLETED")
		updated, _ := reportRepo.FindByID(uint(id))
		return c.JSON(updated)
	}
}
