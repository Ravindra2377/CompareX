FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
# If go.sum doesn't exist yet, we can skip it or handle it. 
# For now, assuming go.mod exists.
RUN go mod download

COPY . .

RUN go build -o main .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
