package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"comparex/database"
	"comparex/models"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupAuthTestDB() {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	db.AutoMigrate(&models.User{})
	database.DB = db
}

func TestRegister(t *testing.T) {
	setupAuthTestDB()
	e := echo.New()

	payload := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if assert.NoError(t, Register(c)) {
		assert.Equal(t, http.StatusCreated, rec.Code)
		var user models.User
		json.Unmarshal(rec.Body.Bytes(), &user)
		assert.Equal(t, "test@example.com", user.Email)
	}
}

func TestRegisterInvalidPayload(t *testing.T) {
	setupAuthTestDB()
	e := echo.New()

	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader([]byte("invalid json")))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if assert.NoError(t, Register(c)) {
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	}
}

func TestRegisterShortPassword(t *testing.T) {
	setupAuthTestDB()
	e := echo.New()

	payload := RegisterRequest{
		Email:    "test@example.com",
		Password: "123",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if assert.NoError(t, Register(c)) {
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Contains(t, rec.Body.String(), "at least 6 characters")
	}
}

func TestLogin(t *testing.T) {
	setupAuthTestDB()
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	// Pre-register a user
	e := echo.New()
	regPayload := RegisterRequest{Email: "user@example.com", Password: "securepassword"}
	regBody, _ := json.Marshal(regPayload)
	regReq := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(regBody))
	regReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	Register(e.NewContext(regReq, httptest.NewRecorder()))

	// Test login
	loginPayload := LoginRequest{Email: "user@example.com", Password: "securepassword"}
	loginBody, _ := json.Marshal(loginPayload)
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(loginBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if assert.NoError(t, Login(c)) {
		assert.Equal(t, http.StatusOK, rec.Code)
		var resp map[string]string
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.NotEmpty(t, resp["token"])
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	setupAuthTestDB()
	e := echo.New()

	loginPayload := LoginRequest{Email: "wrong@example.com", Password: "wrongpassword"}
	loginBody, _ := json.Marshal(loginPayload)
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(loginBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if assert.NoError(t, Login(c)) {
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Contains(t, rec.Body.String(), "Invalid credentials")
	}
}
