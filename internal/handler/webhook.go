package handler

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type webhookPayload struct {
	Event    string `json:"event"`
	ReportID uint   `json:"report_id"`
	Status   string `json:"status"`
}

// triggerWebhook fires an async HTTP POST when a report reaches APPROVED or COMPLETED.
func triggerWebhook(reportID uint, status string) {
	url := os.Getenv("WEBHOOK_URL")
	if url == "" {
		return
	}
	go func() {
		payload := webhookPayload{
			Event:    "report.status_changed",
			ReportID: reportID,
			Status:   status,
		}
		body, err := json.Marshal(payload)
		if err != nil {
			log.Printf("[webhook] marshal error: %v", err)
			return
		}
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Post(url, "application/json", bytes.NewBuffer(body))
		if err != nil {
			log.Printf("[webhook] POST error: %v", err)
			return
		}
		defer resp.Body.Close()
		log.Printf("[webhook] triggered for report %d → %s (HTTP %d)", reportID, status, resp.StatusCode)
	}()
}
