package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveIndianLocation(t *testing.T) {
	// 1. Bengaluru (Metro, Quick-commerce enabled)
	blr := ResolveIndianLocation("Bengaluru", "560034", 0, 0)
	assert.Equal(t, "Bengaluru", blr.City)
	assert.True(t, blr.HasQuickCommerce)
	assert.Equal(t, 12.9716, blr.Latitude)

	// 2. Hyderabad (Metro, Quick-commerce enabled)
	hyd := ResolveIndianLocation("Hyderabad", "500081", 0, 0)
	assert.Equal(t, "Hyderabad", hyd.City)
	assert.True(t, hyd.HasQuickCommerce)
	assert.Equal(t, 17.3850, hyd.Latitude)

	// 3. Rajahmundry (Tier-2/3, Quick-commerce disabled)
	rjy := ResolveIndianLocation("Rajahmundry", "533101", 0, 0)
	assert.Equal(t, "Rajahmundry", rjy.City)
	assert.False(t, rjy.HasQuickCommerce)
	assert.Equal(t, 17.0005, rjy.Latitude)
	assert.Contains(t, rjy.CoverageNote, "Amazon")

	// 4. Pincode prefix lookup (560xxx -> Bengaluru)
	pincodeLoc := ResolveIndianLocation("", "560001", 0, 0)
	assert.Equal(t, "Bengaluru", pincodeLoc.City)
	assert.True(t, pincodeLoc.HasQuickCommerce)

	// 5. Custom GPS coordinates
	custom := ResolveIndianLocation("Mysuru", "570001", 12.2958, 76.6394)
	assert.Equal(t, 12.2958, custom.Latitude)
	assert.Equal(t, 76.6394, custom.Longitude)
}
