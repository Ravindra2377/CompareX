package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompareProductsMissingQuery(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/compare", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := CompareProducts(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCompareProductsServiceNotInitialized(t *testing.T) {
	old := ScraperSvc
	ScraperSvc = nil
	t.Cleanup(func() { ScraperSvc = old })

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/compare?q=milk", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := CompareProducts(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
}
