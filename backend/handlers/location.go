package handlers

import (
	"strings"
)

// LocationDetails holds resolved geographic and quick-commerce coverage information for Indian locations.
type LocationDetails struct {
	City               string  `json:"city"`
	State              string  `json:"state"`
	Pincode            string  `json:"pincode"`
	Latitude           float64 `json:"latitude"`
	Longitude          float64 `json:"longitude"`
	HasQuickCommerce   bool    `json:"has_quick_commerce"` // Blinkit, Zepto, Instamart 10-15m micro-hubs
	CoverageNote       string  `json:"coverage_note"`
}

// cityLocationMap contains verified coordinates and quick commerce availability for major Indian urban centers.
var cityLocationMap = map[string]LocationDetails{
	"bengaluru": {
		City:             "Bengaluru",
		State:            "Karnataka",
		Pincode:          "560001",
		Latitude:         12.9716,
		Longitude:        77.5946,
		HasQuickCommerce: true,
		CoverageNote:     "Full 10-15 min quick-commerce coverage via Blinkit, Zepto, Instamart, BigBasket Now.",
	},
	"bangalore": {
		City:             "Bengaluru",
		State:            "Karnataka",
		Pincode:          "560001",
		Latitude:         12.9716,
		Longitude:        77.5946,
		HasQuickCommerce: true,
		CoverageNote:     "Full 10-15 min quick-commerce coverage via Blinkit, Zepto, Instamart, BigBasket Now.",
	},
	"mumbai": {
		City:             "Mumbai",
		State:            "Maharashtra",
		Pincode:          "400001",
		Latitude:         18.9388,
		Longitude:        72.8354,
		HasQuickCommerce: true,
		CoverageNote:     "High quick-commerce density across South Mumbai, Western & Central suburbs.",
	},
	"delhi": {
		City:             "Delhi",
		State:            "Delhi NCR",
		Pincode:          "110001",
		Latitude:         28.6139,
		Longitude:        77.2090,
		HasQuickCommerce: true,
		CoverageNote:     "Full quick-commerce coverage across Delhi, Gurgaon, Noida, Ghaziabad, Faridabad.",
	},
	"gurgaon": {
		City:             "Gurugram",
		State:            "Haryana",
		Pincode:          "122001",
		Latitude:         28.4595,
		Longitude:        77.0266,
		HasQuickCommerce: true,
		CoverageNote:     "Extensive 10-min dark-store coverage.",
	},
	"noida": {
		City:             "Noida",
		State:            "Uttar Pradesh",
		Pincode:          "201301",
		Latitude:         28.5355,
		Longitude:        77.3910,
		HasQuickCommerce: true,
		CoverageNote:     "Extensive 10-min dark-store coverage.",
	},
	"hyderabad": {
		City:             "Hyderabad",
		State:            "Telangana",
		Pincode:          "500001",
		Latitude:         17.3850,
		Longitude:        78.4867,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce in Hitec City, Gachibowli, Banjara Hills, Secunderabad.",
	},
	"chennai": {
		City:             "Chennai",
		State:            "Tamil Nadu",
		Pincode:          "600001",
		Latitude:         13.0827,
		Longitude:        80.2707,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce in Central & South Chennai.",
	},
	"kolkata": {
		City:             "Kolkata",
		State:            "West Bengal",
		Pincode:          "700001",
		Latitude:         22.5726,
		Longitude:        88.3639,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce in Central, South Kolkata and Salt Lake / New Town.",
	},
	"pune": {
		City:             "Pune",
		State:            "Maharashtra",
		Pincode:          "411001",
		Latitude:         18.5204,
		Longitude:        73.8567,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce in Kothrud, Baner, Viman Nagar, Hinjewadi.",
	},
	"ahmedabad": {
		City:             "Ahmedabad",
		State:            "Gujarat",
		Pincode:          "380001",
		Latitude:         23.0225,
		Longitude:        72.5714,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce across Western Ahmedabad.",
	},
	"jaipur": {
		City:             "Jaipur",
		State:            "Rajasthan",
		Pincode:          "302001",
		Latitude:         26.9124,
		Longitude:        75.7873,
		HasQuickCommerce: true,
		CoverageNote:     "Quick commerce active in core commercial zones.",
	},
	"rajahmundry": {
		City:             "Rajahmundry",
		State:            "Andhra Pradesh",
		Pincode:          "533101",
		Latitude:         17.0005,
		Longitude:        81.8040,
		HasQuickCommerce: false,
		CoverageNote:     "Quick commerce 10-min delivery currently unavailable; nationwide e-commerce (Amazon, Flipkart) available.",
	},
	"chandigarh": {
		City:             "Chandigarh",
		State:            "Punjab / Haryana",
		Pincode:          "160001",
		Latitude:         30.7333,
		Longitude:        76.7794,
		HasQuickCommerce: true,
		CoverageNote:     "Full quick commerce coverage across Tricity.",
	},
	"lucknow": {
		City:             "Lucknow",
		State:            "Uttar Pradesh",
		Pincode:          "226001",
		Latitude:         26.8467,
		Longitude:        80.9462,
		HasQuickCommerce: true,
		CoverageNote:     "Quick commerce active in Gomti Nagar, Hazratganj, Alambagh.",
	},
	"kochi": {
		City:             "Kochi",
		State:            "Kerala",
		Pincode:          "682001",
		Latitude:         9.9312,
		Longitude:        76.2673,
		HasQuickCommerce: true,
		CoverageNote:     "Active quick commerce in Ernakulam and Kakkanad.",
	},
}

// ResolveIndianLocation resolves user location, geographic coordinates, and quick-commerce coverage.
func ResolveIndianLocation(cityName, pincode string, clientLat, clientLng float64) LocationDetails {
	cleanCity := strings.ToLower(strings.TrimSpace(cityName))
	cleanPincode := strings.TrimSpace(pincode)

	// 1. Check exact city name match
	if details, ok := cityLocationMap[cleanCity]; ok {
		if cleanPincode != "" {
			details.Pincode = cleanPincode
		}
		if clientLat != 0 && clientLng != 0 {
			details.Latitude = clientLat
			details.Longitude = clientLng
		}
		return details
	}

	// 2. Check pincode prefix mapping
	if len(cleanPincode) >= 3 {
		prefix3 := cleanPincode[:3]
		switch prefix3 {
		case "560":
			d := cityLocationMap["bengaluru"]
			d.Pincode = cleanPincode
			return d
		case "400":
			d := cityLocationMap["mumbai"]
			d.Pincode = cleanPincode
			return d
		case "110":
			d := cityLocationMap["delhi"]
			d.Pincode = cleanPincode
			return d
		case "122":
			d := cityLocationMap["gurgaon"]
			d.Pincode = cleanPincode
			return d
		case "201":
			d := cityLocationMap["noida"]
			d.Pincode = cleanPincode
			return d
		case "500":
			d := cityLocationMap["hyderabad"]
			d.Pincode = cleanPincode
			return d
		case "600":
			d := cityLocationMap["chennai"]
			d.Pincode = cleanPincode
			return d
		case "700":
			d := cityLocationMap["kolkata"]
			d.Pincode = cleanPincode
			return d
		case "411":
			d := cityLocationMap["pune"]
			d.Pincode = cleanPincode
			return d
		case "380":
			d := cityLocationMap["ahmedabad"]
			d.Pincode = cleanPincode
			return d
		case "533":
			d := cityLocationMap["rajahmundry"]
			d.Pincode = cleanPincode
			return d
		}
	}

	// 3. Fallback for client coordinates if supplied
	if clientLat != 0 && clientLng != 0 {
		resolvedCity := cityName
		if resolvedCity == "" {
			resolvedCity = "India"
		}
		return LocationDetails{
			City:             resolvedCity,
			State:            "India",
			Pincode:          cleanPincode,
			Latitude:         clientLat,
			Longitude:        clientLng,
			HasQuickCommerce: false,
			CoverageNote:     "Custom GPS location; quick-commerce dark stores verified on platform query.",
		}
	}

	// 4. Default: Bengaluru
	defaultLoc := cityLocationMap["bengaluru"]
	if cityName != "" {
		defaultLoc.City = cityName
	}
	if cleanPincode != "" {
		defaultLoc.Pincode = cleanPincode
	}
	return defaultLoc
}
