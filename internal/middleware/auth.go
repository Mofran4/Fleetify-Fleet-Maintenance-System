package middleware

import (
	"fleetify/internal/model"
	"fleetify/internal/repository"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// Auth validates X-User-ID header and stores *model.User in locals.
func Auth(userRepo repository.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		rawID := c.Get("X-User-ID")
		if rawID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "X-User-ID header is required",
			})
		}
		id, err := strconv.ParseUint(rawID, 10, 64)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "X-User-ID must be a valid integer",
			})
		}
		user, err := userRepo.FindByID(uint(id))
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		c.Locals("user", user)
		return c.Next()
	}
}

// RequireRole returns 403 if user's role is not in the allowed list.
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(*model.User)
		if !ok || user == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}
		for _, r := range roles {
			if user.Role == r {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "forbidden: insufficient role",
		})
	}
}
