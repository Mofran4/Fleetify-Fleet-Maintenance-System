# ── Stage 1: Build ────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk --no-cache add git

COPY go.mod ./
RUN go mod download || true

COPY . .
# go mod tidy ensures go.sum is complete inside Docker
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o fleetify ./cmd/main.go

# ── Stage 2: Run ───────────────────────────────────────────
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/fleetify .
COPY --from=builder /app/frontend ./frontend

RUN mkdir -p ./uploads

EXPOSE 8080
CMD ["./fleetify"]
