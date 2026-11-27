package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateSafeURL(t *testing.T) {
	// Blocked Schemes
	assert.ErrorIs(t, ValidateSafeURL("file:///etc/passwd"), ErrInvalidScheme)
	assert.ErrorIs(t, ValidateSafeURL("ftp://ftp.example.com"), ErrInvalidScheme)
	assert.ErrorIs(t, ValidateSafeURL("gopher://example.com"), ErrInvalidScheme)

	// Blocked Loopback & Localhost
	assert.ErrorIs(t, ValidateSafeURL("http://127.0.0.1:8080/admin"), ErrPrivateIPBlocked)
	assert.ErrorIs(t, ValidateSafeURL("http://localhost:3000"), ErrDisallowedHost)
	assert.ErrorIs(t, ValidateSafeURL("http://sub.local"), ErrDisallowedHost)
	assert.ErrorIs(t, ValidateSafeURL("http://service.internal"), ErrDisallowedHost)

	// Blocked Cloud Metadata
	assert.ErrorIs(t, ValidateSafeURL("http://169.254.169.254/latest/meta-data"), ErrPrivateIPBlocked)
	assert.ErrorIs(t, ValidateSafeURL("http://metadata.google.internal/computeMetadata/v1/"), ErrDisallowedHost)

	// Blocked Private RFC1918 Ranges
	assert.ErrorIs(t, ValidateSafeURL("http://10.0.0.1/status"), ErrPrivateIPBlocked)
	assert.ErrorIs(t, ValidateSafeURL("http://172.16.0.1/metrics"), ErrPrivateIPBlocked)
	assert.ErrorIs(t, ValidateSafeURL("http://192.168.1.1/router"), ErrPrivateIPBlocked)

	// Permitted Public URLs (syntax & scheme validation)
	assert.NoError(t, ValidateSafeURL("https://93.184.216.34/test")) // Public IPv4 (example.com)
	assert.NoError(t, ValidateSafeURL("https://1.1.1.1/dns-query")) // Cloudflare Public DNS

	if err := ValidateSafeURL("https://en.wikipedia.org/wiki/India"); err != nil {
		t.Logf("DNS lookup skipped in offline environment: %v", err)
	}
}

