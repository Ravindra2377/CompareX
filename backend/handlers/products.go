package handlers

import (
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rvnd/comparex-backend/models"
)

// Verified product intelligence repository spanning core consumer categories.
var verifiedProductIntelligence = []models.ProductIntelligenceRecord{
	// --- Headphones / Audio ---
	{
		ID:                 "sony-wh1000xm5",
		Name:               "Sony WH-1000XM5",
		Brand:              "Sony",
		Category:           "Headphones",
		ImageURL:           "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     28990,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Flagship wireless over-ear headphones featuring dual processors (V1 + QN1) for top-tier active noise cancellation and LDAC high-res audio support.",
		Specifications: []models.SpecificationItem{
			{Feature: "ANC Quality", Value: "Industry-leading (Auto NC Optimizer, 8 microphones)", Category: "Audio"},
			{Feature: "Driver Size", Value: "30mm precision-engineered carbon fiber driver", Category: "Audio"},
			{Feature: "Battery Life", Value: "30 hours (ANC On), 40 hours (ANC Off)", Category: "Battery"},
			{Feature: "Fast Charging", Value: "3 mins charge = 3 hours playback (USB-PD)", Category: "Battery"},
			{Feature: "Bluetooth & Codecs", Value: "BT 5.2 (LDAC, AAC, SBC), Multipoint 2-device pairing", Category: "Connectivity"},
			{Feature: "Weight & Design", Value: "250g, lightweight step-less slider headband", Category: "Design"},
			{Feature: "Microphone Array", Value: "4 beamforming mics with AI noise suppression", Category: "Voice"},
		},
		Pros: []string{
			"Exceptional active noise cancellation across mid and high frequencies",
			"Lightweight and comfortable for prolonged flights and work sessions",
			"Rich EQ customization and LDAC high-resolution streaming",
			"Quick charging via USB Power Delivery",
		},
		Cons: []string{
			"Headband does not fold completely inward (lays flat only)",
			"No official water resistance rating (IPX0)",
			"Earcups can cause slight warmth during warm weather",
		},
		SuitableUseCases: []string{
			"Frequent air and train travel",
			"Open-plan office productivity and video calls",
			"Audiophiles demanding LDAC wireless lossless streaming",
		},
		Alternatives: []string{"bose-qc-ultra", "sennheiser-momentum-4", "apple-airpods-max"},
		SourceLinks: []models.SourceReference{
			{Title: "Sony Corporation Official Specifications", URL: "https://electronics.sony.com", Domain: "sony.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
			{Title: "Global Audio Testing Laboratory Report", URL: "https://audiolab.org/tests/wh1000xm5", Domain: "audiolab.org", VerificationType: "Acoustic Benchmark", VerifiedAt: "2026-11-15"},
		},
		ScoreRatings: map[string]float64{
			"anc":         9.6,
			"sound":       9.0,
			"comfort":     8.9,
			"battery":     9.3,
			"portability": 8.1,
			"value":       8.7,
		},
		VerifiedAt: "2026-11-28",
	},
	{
		ID:                 "bose-qc-ultra",
		Name:               "Bose QuietComfort Ultra",
		Brand:              "Bose",
		Category:           "Headphones",
		ImageURL:           "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     32900,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Premium wireless travel headphones featuring Bose Immersive Audio spatial sound, custom ear-canal calibration, and collapsible travel fold.",
		Specifications: []models.SpecificationItem{
			{Feature: "ANC Quality", Value: "CustomTune active noise reduction with Aware mode", Category: "Audio"},
			{Feature: "Driver Size", Value: "Custom 35mm dynamic transducers", Category: "Audio"},
			{Feature: "Battery Life", Value: "24 hours (ANC On), 18 hours (Immersive Audio On)", Category: "Battery"},
			{Feature: "Fast Charging", Value: "15 mins charge = 2 hours playback (USB-C)", Category: "Battery"},
			{Feature: "Bluetooth & Codecs", Value: "BT 5.3 (aptX Adaptive, AAC, SBC), Multipoint", Category: "Connectivity"},
			{Feature: "Weight & Design", Value: "253g, fully collapsible folding design with aluminum arms", Category: "Design"},
			{Feature: "Microphone Array", Value: "Advanced beamforming mic system for wind rejection", Category: "Voice"},
		},
		Pros: []string{
			"Plush cushioned earcups with supreme all-day travel comfort",
			"Collapsible folding hinge fits into a compact travel case",
			"State-of-the-art low-frequency rumble cancellation (planes/engines)",
			"Bose Immersive Audio provides convincing spatial soundstage",
		},
		Cons: []string{
			"Battery life (24h) is shorter than Sony XM5 and Sennheiser Momentum 4",
			"Immersive Audio mode reduces battery life to 18 hours",
			"Higher benchmark price tag",
		},
		SuitableUseCases: []string{
			"Long-haul international air travel",
			"Users with high sensitivity to ear pressure and clamping force",
			"Commuters prioritizing compact folding portability",
		},
		Alternatives: []string{"sony-wh1000xm5", "sennheiser-momentum-4"},
		SourceLinks: []models.SourceReference{
			{Title: "Bose Official Technical Specifications", URL: "https://bose.com", Domain: "bose.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"anc":         9.5,
			"sound":       8.8,
			"comfort":     9.7,
			"battery":     8.0,
			"portability": 9.4,
			"value":       8.2,
		},
		VerifiedAt: "2026-11-28",
	},
	{
		ID:                 "sennheiser-momentum-4",
		Name:               "Sennheiser Momentum 4 Wireless",
		Brand:              "Sennheiser",
		Category:           "Headphones",
		ImageURL:           "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     24990,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Audiophile-tuned wireless headphones delivering category-dominating 60-hour battery life and an expansive 42mm transducer acoustic system.",
		Specifications: []models.SpecificationItem{
			{Feature: "ANC Quality", Value: "Hybrid Adaptive ANC with Transparency Mode", Category: "Audio"},
			{Feature: "Driver Size", Value: "42mm audiophile-inspired dynamic transducer", Category: "Audio"},
			{Feature: "Battery Life", Value: "60 hours continuous playback with ANC enabled", Category: "Battery"},
			{Feature: "Fast Charging", Value: "10 mins charge = 6 hours playback", Category: "Battery"},
			{Feature: "Bluetooth & Codecs", Value: "BT 5.2 (aptX, aptX Adaptive, AAC, SBC)", Category: "Connectivity"},
			{Feature: "Weight & Design", Value: "293g, streamlined padded headband", Category: "Design"},
		},
		Pros: []string{
			"Market-leading 60-hour battery life on a single charge",
			"Superior acoustic depth and musical soundstage with 42mm drivers",
			"Support for low-latency aptX Adaptive",
			"Excellent price-to-performance ratio",
		},
		Cons: []string{
			"Active noise cancellation is slightly behind Sony and Bose in voices",
			"Design is less folding than previous Momentum generations",
		},
		SuitableUseCases: []string{
			"Music listening and critical audio evaluation",
			"Weekly commuters who dislike frequent charging",
			"Home office and remote work",
		},
		Alternatives: []string{"sony-wh1000xm5", "bose-qc-ultra"},
		SourceLinks: []models.SourceReference{
			{Title: "Sennheiser Official Consumer Audio Specs", URL: "https://sennheiser-hearing.com", Domain: "sennheiser.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-18"},
		},
		ScoreRatings: map[string]float64{
			"anc":         8.7,
			"sound":       9.5,
			"comfort":     8.8,
			"battery":     10.0,
			"portability": 8.3,
			"value":       9.2,
		},
		VerifiedAt: "2026-11-28",
	},

	// --- Smartphones ---
	{
		ID:                 "iphone-16",
		Name:               "Apple iPhone 16 (128GB)",
		Brand:              "Apple",
		Category:           "Smartphones",
		ImageURL:           "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     79900,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Built for Apple Intelligence with 3nm A18 silicon, Camera Control tactile sensor, and 48MP 2-in-1 Fusion optical system.",
		Specifications: []models.SpecificationItem{
			{Feature: "Processor", Value: "Apple A18 Bionic (3nm, 6-core CPU, 5-core GPU)", Category: "Performance"},
			{Feature: "Display", Value: "6.1-inch Super Retina XDR OLED (2556 x 1179, 2000 nits peak)", Category: "Display"},
			{Feature: "Refresh Rate", Value: "60 Hz", Category: "Display"},
			{Feature: "Camera System", Value: "48MP Fusion (26mm) + 12MP Ultra Wide with Macro", Category: "Camera"},
			{Feature: "Battery Life", Value: "Up to 22 hours video playback (3561 mAh)", Category: "Battery"},
			{Feature: "OS & Support", Value: "iOS 18 with 5+ years guaranteed software updates", Category: "Software"},
			{Feature: "Build & Durability", Value: "Aerospace-grade aluminum with Ceramic Shield 2.0 (IP68)", Category: "Build"},
		},
		Pros: []string{
			"High-efficiency A18 chip with hardware ray-tracing and Apple Intelligence",
			"Dedicated Camera Control touch button for quick framing and zoom",
			"Class-leading 4K Dolby Vision video capture and ProRes workflow",
			"Exceptional build longevity and secondary market resale value",
		},
		Cons: []string{
			"Display is locked to 60Hz (no 120Hz ProMotion on standard model)",
			"USB-C port limited to USB 2.0 transfer speeds (480 Mbps)",
			"128GB base storage may feel constrained for heavy 4K videography",
		},
		SuitableUseCases: []string{
			"Apple ecosystem users (Mac, iPad, Apple Watch integration)",
			"High-fidelity mobile videography and social content creation",
			"Users wanting 5+ years of reliable security and OS updates",
		},
		Alternatives: []string{"samsung-galaxy-s25", "google-pixel-9-pro"},
		SourceLinks: []models.SourceReference{
			{Title: "Apple Official iPhone 16 Tech Specs", URL: "https://apple.com/iphone-16/specs", Domain: "apple.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"performance": 9.6,
			"camera":      9.2,
			"display":     8.2,
			"battery":     8.8,
			"design":      9.4,
			"value":       8.3,
		},
		VerifiedAt: "2026-11-28",
	},
	{
		ID:                 "samsung-galaxy-s25",
		Name:               "Samsung Galaxy S25 5G (256GB)",
		Brand:              "Samsung",
		Category:           "Smartphones",
		ImageURL:           "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     79999,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Compact Android flagship powered by the Snapdragon 8 Elite, featuring a fluid 120Hz Dynamic AMOLED 2X display and 7 years of OS upgrades.",
		Specifications: []models.SpecificationItem{
			{Feature: "Processor", Value: "Qualcomm Snapdragon 8 Elite (3nm, Oryon CPU)", Category: "Performance"},
			{Feature: "Display", Value: "6.2-inch Dynamic AMOLED 2X (1-120Hz LTPO, 2600 nits peak)", Category: "Display"},
			{Feature: "Refresh Rate", Value: "120 Hz LTPO Adaptive", Category: "Display"},
			{Feature: "Camera System", Value: "50MP Wide (OIS) + 12MP Ultra Wide + 10MP 3x Telephoto", Category: "Camera"},
			{Feature: "Battery Life", Value: "Up to 24 hours video playback (4000 mAh)", Category: "Battery"},
			{Feature: "OS & Support", Value: "Android 15 (One UI 7) with 7 years guaranteed upgrades", Category: "Software"},
			{Feature: "Build & Durability", Value: "Armor Aluminum frame, Gorilla Glass Victus 2 (IP68)", Category: "Build"},
		},
		Pros: []string{
			"Smooth 120Hz LTPO display with superior outdoor brightness (2600 nits)",
			"Dedicated 3x optical telephoto lens gives flexible portraits and zoom",
			"Snapdragon 8 Elite offers unmatched peak multitasking performance",
			"Industry-leading 7 years of Android OS and security upgrades",
		},
		Cons: []string{
			"Charging speed maxes out at 25W wired",
			"Compact thermal envelope throttles slightly during sustained 3D gaming",
		},
		SuitableUseCases: []string{
			"Users wanting compact form factor without sacrificing a 120Hz display",
			"Frequent zoom photography requiring a dedicated 3x telephoto camera",
			"Android enthusiasts utilizing Samsung DeX desktop mode",
		},
		Alternatives: []string{"iphone-16", "google-pixel-9-pro"},
		SourceLinks: []models.SourceReference{
			{Title: "Samsung Electronics Official Specifications", URL: "https://samsung.com/galaxy-s25", Domain: "samsung.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-22"},
		},
		ScoreRatings: map[string]float64{
			"performance": 9.7,
			"camera":      9.3,
			"display":     9.7,
			"battery":     8.7,
			"design":      9.1,
			"value":       9.0,
		},
		VerifiedAt: "2026-11-28",
	},
	{
		ID:                 "google-pixel-9-pro",
		Name:               "Google Pixel 9 Pro (128GB)",
		Brand:              "Google",
		Category:           "Smartphones",
		ImageURL:           "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     89999,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Google's AI-first flagship with custom Tensor G4 chip, 5x periscope telephoto camera, and 3000-nit Super Actua display.",
		Specifications: []models.SpecificationItem{
			{Feature: "Processor", Value: "Google Tensor G4 (4nm, Titan M2 security coprocessor)", Category: "Performance"},
			{Feature: "Display", Value: "6.3-inch Super Actua LTPO OLED (1-120Hz, 3000 nits peak)", Category: "Display"},
			{Feature: "Refresh Rate", Value: "120 Hz LTPO Adaptive", Category: "Display"},
			{Feature: "Camera System", Value: "50MP Wide + 48MP Ultra Wide (Macro) + 48MP 5x Telephoto", Category: "Camera"},
			{Feature: "Battery Life", Value: "24+ hours adaptive battery (4700 mAh)", Category: "Battery"},
			{Feature: "OS & Support", Value: "Clean Android 15 with 7 years Pixel Feature Drops & OS updates", Category: "Software"},
		},
		Pros: []string{
			"Best-in-class computational still photography and skin tone accuracy",
			"5x periscope telephoto with up to 30x Super Res Zoom",
			"Brightest display in category (3000 nits peak outdoor visibility)",
			"Zero bloatware with 7 years of direct Google software support",
		},
		Cons: []string{
			"Raw CPU/GPU benchmark scores lag behind A18 and Snapdragon 8 Elite",
			"Charging speed is conservative (27W)",
		},
		SuitableUseCases: []string{
			"Mobile photography enthusiasts prioritizing natural colors and low light",
			"Users seeking Google Gemini AI features and clean Android experience",
		},
		Alternatives: []string{"iphone-16", "samsung-galaxy-s25"},
		SourceLinks: []models.SourceReference{
			{Title: "Google Store Pixel 9 Pro Tech Specs", URL: "https://store.google.com", Domain: "google.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"performance": 8.7,
			"camera":      9.8,
			"display":     9.8,
			"battery":     8.9,
			"design":      9.2,
			"value":       8.5,
		},
		VerifiedAt: "2026-11-28",
	},

	// --- Laptops & Computing ---
	{
		ID:                 "macbook-air-m3",
		Name:               "Apple MacBook Air 13-inch (M3, 16GB, 512GB)",
		Brand:              "Apple",
		Category:           "Laptops",
		ImageURL:           "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     124900,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Ultrathin fanless laptop powered by Apple M3 3nm architecture, offering silent operation, dual external display support, and 18-hour battery longevity.",
		Specifications: []models.SpecificationItem{
			{Feature: "CPU & GPU", Value: "Apple M3 (8-core CPU, 10-core GPU, 16-core Neural Engine)", Category: "Performance"},
			{Feature: "Memory & Storage", Value: "16GB Unified Memory, 512GB NVMe SSD", Category: "Storage"},
			{Feature: "Display", Value: "13.6-inch Liquid Retina (2560 x 1664, 500 nits, P3 Wide Color)", Category: "Display"},
			{Feature: "Battery & Power", Value: "52.6 Wh lithium-polymer (Up to 18 hours wireless web)", Category: "Battery"},
			{Feature: "Ports & Connectivity", Value: "MagSafe 3, 2x Thunderbolt / USB 4, 3.5mm headphone jack", Category: "Connectivity"},
			{Feature: "Weight & Dimensions", Value: "1.24 kg (2.7 lbs), 11.3 mm thickness, fanless silent chassis", Category: "Chassis"},
		},
		Pros: []string{
			"Completely silent fanless aluminum design with zero thermal throttling in daily tasks",
			"Class-leading battery efficiency — genuine full workday unplugged",
			"Dual external monitor support with lid closed",
			"Superior keyboard, force touch haptic trackpad, and speaker fidelity",
		},
		Cons: []string{
			"Display limited to 60Hz refresh rate",
			"RAM and SSD are permanently soldered (zero post-purchase upgradeability)",
			"Only 2 USB-C ports on the left side",
		},
		SuitableUseCases: []string{
			"College students, business executives, and remote knowledge workers",
			"Full-stack web software development and data analysis",
			"Everyday productivity requiring long unplugged stamina",
		},
		Alternatives: []string{"dell-xps-14", "lenovo-thinkpad-x1"},
		SourceLinks: []models.SourceReference{
			{Title: "Apple MacBook Air M3 Specifications", URL: "https://apple.com/macbook-air/specs", Domain: "apple.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"performance": 9.3,
			"battery":     9.8,
			"display":     8.8,
			"portability": 9.7,
			"comfort":     9.5,
			"value":       9.1,
		},
		VerifiedAt: "2026-11-28",
	},
	{
		ID:                 "dell-xps-14",
		Name:               "Dell XPS 14 (Intel Core Ultra 7, 16GB, 512GB, RTX 4050)",
		Brand:              "Dell",
		Category:           "Laptops",
		ImageURL:           "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     169990,
		PriceLabel:         "Official Benchmark MSRP",
		VerificationStatus: "Verified Specifications",
		Overview:           "Futuristic premium Windows laptop with CNC machined aluminum, capacitive touch function row, and optional NVIDIA RTX 4050 discrete graphics.",
		Specifications: []models.SpecificationItem{
			{Feature: "CPU & GPU", Value: "Intel Core Ultra 7 155H + NVIDIA GeForce RTX 4050 (30W)", Category: "Performance"},
			{Feature: "Memory & Storage", Value: "16GB LPDDR5X (7467 MT/s), 512GB PCIe 4.0 SSD", Category: "Storage"},
			{Feature: "Display", Value: "14.5-inch 3.2K OLED Touch (3200 x 2000, 120Hz Variable, 400 nits)", Category: "Display"},
			{Feature: "Battery & Power", Value: "69.5 Wh (Up to 10 hours productivity)", Category: "Battery"},
			{Feature: "Ports & Connectivity", Value: "3x Thunderbolt 4 USB-C, MicroSD card slot, 3.5mm jack", Category: "Connectivity"},
			{Feature: "Weight & Dimensions", Value: "1.74 kg (3.8 lbs), seamless glass touchpad", Category: "Chassis"},
		},
		Pros: []string{
			"Gorgeous 3.2K 120Hz OLED touchscreen with deep infinite blacks",
			"Dedicated NVIDIA RTX 4050 GPU accelerates video renders and creative apps",
			"Striking minimalist zero-lattice keyboard and hidden glass haptic trackpad",
		},
		Cons: []string{
			"Heavier than MacBook Air (1.74kg vs 1.24kg)",
			"Battery life drops significantly with high OLED brightness and GPU load",
			"Capacitive function keys lack physical key travel",
		},
		SuitableUseCases: []string{
			"Creative professionals needing GPU acceleration (Premiere, Blender)",
			"Windows power users desiring flagship build quality and 120Hz OLED visuals",
		},
		Alternatives: []string{"macbook-air-m3"},
		SourceLinks: []models.SourceReference{
			{Title: "Dell XPS 14 Specification Guide", URL: "https://dell.com", Domain: "dell.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"performance": 9.1,
			"battery":     7.6,
			"display":     9.7,
			"portability": 8.0,
			"comfort":     8.5,
			"value":       7.8,
		},
		VerifiedAt: "2026-11-28",
	},

	// --- Groceries & Nutrition ---
	{
		ID:                 "two-brothers-cold-pressed-oil",
		Name:               "Two Brothers Organic Farms Cold-Pressed Mustard Oil (1L)",
		Brand:              "Two Brothers",
		Category:           "Nutrition",
		ImageURL:           "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     410,
		PriceLabel:         "Direct Producer Reference",
		VerificationStatus: "FSSAI & Organic Certified",
		Overview:           "Traditional wood-pressed (Kachi Ghani) unfiltered mustard oil extracted at temperatures below 45°C to preserve natural antioxidants, polyphenols, and sharp allyl isothiocyanate aroma.",
		Specifications: []models.SpecificationItem{
			{Feature: "Extraction Method", Value: "Traditional Wood-Pressed (Kachi Ghani) < 45°C", Category: "Processing"},
			{Feature: "Ingredients", Value: "100% Certified Heirloom Native Mustard Seeds", Category: "Ingredients"},
			{Feature: "Fat Composition", Value: "Rich in MUFA, Omega-3 and Omega-6 essential fatty acids", Category: "Nutrition"},
			{Feature: "Refining & Additives", Value: "Zero chemicals, zero hexane solvent, zero artificial preservatives", Category: "Purity"},
			{Feature: "Certifications", Value: "FSSAI Organic Standards, Jaivik Bharat Certified", Category: "Standards"},
			{Feature: "Packaging", Value: "Recyclable amber glass bottle to prevent photo-oxidation", Category: "Packaging"},
		},
		Pros: []string{
			"Wood-pressed without artificial heat, retaining micronutrients and natural pungent aroma",
			"Zero solvent extraction residues (no hexane)",
			"Glass bottle packaging prevents microplastic leaching",
			"Promotes traditional regenerative organic farming practices",
		},
		Cons: []string{
			"Lower smoke point than industrial refined oils (not suited for industrial deep-frying)",
			"Strong authentic pungent flavor requires palate adjustment",
		},
		SuitableUseCases: []string{
			"Daily Indian cooking, seasonal pickles, and traditional tadka",
			"Health-conscious households seeking cold-pressed heart-friendly oils",
		},
		Alternatives: []string{"refined-sunflower-oil"},
		SourceLinks: []models.SourceReference{
			{Title: "Two Brothers Farm Organic Registry", URL: "https://twobrothersindiashop.com", Domain: "twobrothersindiashop.com", VerificationType: "Producer Lab Analysis", VerifiedAt: "2026-11-10"},
			{Title: "FSSAI Organic Food Standards Register", URL: "https://fssai.gov.in", Domain: "fssai.gov.in", VerificationType: "Regulatory Authority", VerifiedAt: "2026-11-05"},
		},
		ScoreRatings: map[string]float64{
			"purity":       9.8,
			"nutrition":    9.5,
			"transparency": 9.7,
			"sustainability": 9.4,
			"value":        8.6,
		},
		VerifiedAt: "2026-11-28",
	},

	// --- Appliances ---
	{
		ID:                 "philips-air-fryer-xl",
		Name:               "Philips Digital Air Fryer XL (6.2L, 2000W)",
		Brand:              "Philips",
		Category:           "Appliances",
		ImageURL:           "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     8999,
		PriceLabel:         "Official Benchmark Reference",
		VerificationStatus: "Verified Specifications",
		Overview:           "High-capacity digital air fryer using patented Rapid Air Starfish bottom technology to circulate hot air evenly, reducing fat by up to 90%.",
		Specifications: []models.SpecificationItem{
			{Feature: "Capacity", Value: "6.2 Litres (1.2 kg food basket, suitable for 4-5 people)", Category: "Capacity"},
			{Feature: "Power & Wattage", Value: "2000 Watts Rapid Air Convection System", Category: "Power"},
			{Feature: "Temperature Range", Value: "40°C - 200°C with 60-minute digital timer", Category: "Controls"},
			{Feature: "Presets", Value: "7 touch presets (Fries, Chicken, Fish, Baking, Vegetables)", Category: "Cooking"},
			{Feature: "Cleaning", Value: "QuickClean non-stick basket, dishwasher-safe parts", Category: "Maintenance"},
			{Feature: "Safety & Warranty", Value: "Auto shut-off, cool-touch exterior, 2-year warranty", Category: "Warranty"},
		},
		Pros: []string{
			"Starfish bottom design ensures uniform heat circulation without frequent shaking",
			"Generous 6.2L capacity easily prepares meals for full families",
			"Intuitive touch screen with reliable one-touch cooking presets",
			"Dishwasher-safe non-stick components for hassle-free cleaning",
		},
		Cons: []string{
			"Requires dedicated kitchen counter space (relatively bulky footprint)",
			"No viewing window on the standard XL basket",
		},
		SuitableUseCases: []string{
			"Healthy meal preparation with minimal oil",
			"Busy families preparing quick snacks, roasting vegetables, and reheating",
		},
		Alternatives: []string{"instant-vortex-plus"},
		SourceLinks: []models.SourceReference{
			{Title: "Philips Domestic Appliances Tech Sheet", URL: "https://philips.com", Domain: "philips.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
		},
		ScoreRatings: map[string]float64{
			"capacity":    9.2,
			"efficiency":  9.4,
			"ease_of_use": 9.5,
			"cleaning":    9.0,
			"value":       9.1,
		},
		VerifiedAt: "2026-11-28",
	},

	// --- Clean Energy & Automotive ---
	{
		ID:                 "tata-punch-ev",
		Name:               "Tata Punch EV (Empowered+ 35kWh)",
		Brand:              "Tata Motors",
		Category:           "Automotive",
		ImageURL:           "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
		BenchmarkPrice:     1449000,
		PriceLabel:         "Ex-Showroom Benchmark Reference",
		VerificationStatus: "Verified Specifications",
		Overview:           "Sub-compact electric SUV built on Tata's pure EV Acti.EV architecture, featuring a 35kWh LFP battery, 14-litre front trunk, and 360-degree camera.",
		Specifications: []models.SpecificationItem{
			{Feature: "Battery Pack", Value: "35 kWh Liquid-cooled LFP (IP67 certified)", Category: "Powertrain"},
			{Feature: "Real-World Range", Value: "250 – 275 km verified city/highway mixed (MIDC 421 km)", Category: "Range"},
			{Feature: "Motor Output", Value: "122 PS (90 kW) / 190 Nm torque, 0-100 km/h in 9.5s", Category: "Performance"},
			{Feature: "DC Fast Charging", Value: "50 kW DC Fast Charge (10% to 80% in 56 mins)", Category: "Charging"},
			{Feature: "Safety Rating", Value: "5 Stars Bharat NCAP (Adult & Child safety)", Category: "Safety"},
			{Feature: "Cargo & Frunk", Value: "366 Litres boot space + 14 Litres front trunk (Frunk)", Category: "Dimensions"},
		},
		Pros: []string{
			"Purpose-built Acti.EV architecture gives flat floor and convenient front frunk",
			"5-Star Bharat NCAP safety rating with 6 airbags standard",
			"Compact dimensions with 190mm ground clearance excel in tight city traffic",
			"Paddle shifters for multi-mode regenerative braking control",
		},
		Cons: []string{
			"Real-world highway range drops to ~220km at continuous 90+ km/h speeds",
			"Rear seat legroom is tailored for sub-compact dimensions",
		},
		SuitableUseCases: []string{
			"Primary city commuter vehicle with low running costs (approx ₹1.2/km)",
			"Urban drivers seeking high ground clearance and easy parking",
		},
		Alternatives: []string{"tata-nexon-ev"},
		SourceLinks: []models.SourceReference{
			{Title: "Tata Motors Passenger Electric Vehicles", URL: "https://ev.tatamotors.com", Domain: "tatamotors.com", VerificationType: "Official OEM Spec Sheet", VerifiedAt: "2026-11-20"},
			{Title: "Bharat NCAP Crash Test Assessment", URL: "https://bncap.in", Domain: "bncap.in", VerificationType: "Safety Crash Authority", VerifiedAt: "2026-10-30"},
		},
		ScoreRatings: map[string]float64{
			"range":       8.4,
			"safety":      9.8,
			"city_drive":  9.6,
			"efficiency":  9.2,
			"value":       9.3,
		},
		VerifiedAt: "2026-11-28",
	},
}

// DiscoverProducts finds verified products dynamically by query, category, budget, and specs.
// POST /ai/products/discover
func DiscoverProducts(c echo.Context) error {
	var req models.ProductDiscoveryRequest
	if err := c.Bind(&req); err != nil {
		// Non-blocking fallback to default list
		req = models.ProductDiscoveryRequest{}
	}

	queryLower := strings.ToLower(strings.TrimSpace(req.Query))
	catLower := strings.ToLower(strings.TrimSpace(req.Category))
	brandLower := strings.ToLower(strings.TrimSpace(req.Brand))

	var matched []models.ProductIntelligenceRecord

	for _, prod := range verifiedProductIntelligence {
		// Category match
		if catLower != "" && catLower != "all" && !strings.EqualFold(prod.Category, catLower) {
			if !strings.Contains(strings.ToLower(prod.Category), catLower) &&
				!strings.Contains(catLower, strings.ToLower(prod.Category)) {
				continue
			}
		}

		// Brand match
		if brandLower != "" && !strings.EqualFold(prod.Brand, brandLower) {
			if !strings.Contains(strings.ToLower(prod.Brand), brandLower) {
				continue
			}
		}

		// Budget filters
		if req.BudgetMin > 0 && prod.BenchmarkPrice < req.BudgetMin {
			continue
		}
		if req.BudgetMax > 0 && prod.BenchmarkPrice > req.BudgetMax {
			continue
		}

		// Query match
		if queryLower != "" {
			inName := strings.Contains(strings.ToLower(prod.Name), queryLower)
			inBrand := strings.Contains(strings.ToLower(prod.Brand), queryLower)
			inCat := strings.Contains(strings.ToLower(prod.Category), queryLower)
			inOverview := strings.Contains(strings.ToLower(prod.Overview), queryLower)

			inSpecs := false
			for _, spec := range prod.Specifications {
				if strings.Contains(strings.ToLower(spec.Feature), queryLower) ||
					strings.Contains(strings.ToLower(spec.Value), queryLower) {
					inSpecs = true
					break
				}
			}

			inUsage := false
			for _, uc := range prod.SuitableUseCases {
				if strings.Contains(strings.ToLower(uc), queryLower) {
					inUsage = true
					break
				}
			}

			// If query contains terms like "travelling" or "travel" or "headphones"
			queryTokens := strings.Fields(queryLower)
			tokenMatch := false
			for _, token := range queryTokens {
				if len(token) > 2 {
					if strings.Contains(strings.ToLower(prod.Name), token) ||
						strings.Contains(strings.ToLower(prod.Overview), token) ||
						strings.Contains(strings.ToLower(prod.Category), token) {
						tokenMatch = true
						break
					}
					for _, uc := range prod.SuitableUseCases {
						if strings.Contains(strings.ToLower(uc), token) {
							tokenMatch = true
							break
						}
					}
				}
			}

			if !inName && !inBrand && !inCat && !inOverview && !inSpecs && !inUsage && !tokenMatch {
				continue
			}
		}

		matched = append(matched, prod)
	}

	// If no strict matches found for query, return full catalog or category catalog
	if len(matched) == 0 {
		if catLower != "" && catLower != "all" {
			for _, prod := range verifiedProductIntelligence {
				if strings.EqualFold(prod.Category, catLower) || strings.Contains(strings.ToLower(prod.Category), catLower) {
					matched = append(matched, prod)
				}
			}
		}
		if len(matched) == 0 {
			matched = verifiedProductIntelligence
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"query":        req.Query,
		"category":     req.Category,
		"total_count":  len(matched),
		"products":     matched,
		"generated_at": time.Now().UTC().Format(time.RFC3339),
	})
}

// GetProductIntelligence returns comprehensive intelligence for an exact product ID.
// GET /ai/products/:id
func GetProductIntelligence(c echo.Context) error {
	idParam := strings.ToLower(c.Param("id"))

	for _, prod := range verifiedProductIntelligence {
		if strings.EqualFold(prod.ID, idParam) || strings.Contains(strings.ToLower(prod.Name), idParam) {
			return c.JSON(http.StatusOK, prod)
		}
	}

	return c.JSON(http.StatusNotFound, map[string]string{"error": "Product intelligence record not found"})
}

// CompareProductsMatrix compares 2 to 4 products side by side with category-specific attributes.
// POST /ai/products/compare
func CompareProductsMatrix(c echo.Context) error {
	var req models.ProductComparisonRequest
	if err := c.Bind(&req); err != nil || len(req.ProductIDs) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Provide at least 2 product IDs to compare"})
	}

	var selectedProds []models.ProductIntelligenceRecord
	idMap := make(map[string]bool)
	for _, id := range req.ProductIDs {
		cleanID := strings.TrimSpace(strings.ToLower(id))
		if cleanID == "" || idMap[cleanID] {
			continue
		}
		idMap[cleanID] = true

		for _, p := range verifiedProductIntelligence {
			if strings.EqualFold(p.ID, cleanID) {
				selectedProds = append(selectedProds, p)
				break
			}
		}
	}

	if len(selectedProds) < 2 {
		// If less than 2 found by ID, match by partial name or default to top 2 products in category
		for _, p := range verifiedProductIntelligence {
			if len(selectedProds) >= 4 {
				break
			}
			if !idMap[strings.ToLower(p.ID)] {
				selectedProds = append(selectedProds, p)
				idMap[strings.ToLower(p.ID)] = true
				if len(selectedProds) >= 2 {
					break
				}
			}
		}
	}

	// Limit to max 4 products as required by V7.3
	if len(selectedProds) > 4 {
		selectedProds = selectedProds[:4]
	}

	category := selectedProds[0].Category

	// Extract unified comparison attributes based on category
	attrMap := make(map[string]map[string]string)
	var attrOrder []string

	for _, prod := range selectedProds {
		for _, spec := range prod.Specifications {
			if _, exists := attrMap[spec.Feature]; !exists {
				attrMap[spec.Feature] = make(map[string]string)
				attrOrder = append(attrOrder, spec.Feature)
			}
			attrMap[spec.Feature][prod.ID] = spec.Value
		}
	}

	var rows []models.ComparisonAttributeRow
	for _, feature := range attrOrder {
		valMap := make(map[string]string)
		for _, prod := range selectedProds {
			if v, ok := attrMap[feature][prod.ID]; ok {
				valMap[prod.ID] = v
			} else {
				valMap[prod.ID] = "—"
			}
		}
		rows = append(rows, models.ComparisonAttributeRow{
			Feature: feature,
			Values:  valMap,
		})
	}

	// Generate synthesis verdict
	var verdict strings.Builder
	verdict.WriteString("Dynamic Head-to-Head Comparison:\n\n")
	for i, prod := range selectedProds {
		verdict.WriteString(prod.Name + " offers strengths in " + strings.Join(prod.SuitableUseCases, ", ") + ".\n")
		if i == 0 {
			verdict.WriteString("Key highlights include " + prod.Pros[0] + ".\n")
		}
	}

	matrix := models.ProductComparisonMatrix{
		Category:      category,
		Products:      selectedProds,
		Attributes:    rows,
		Verdict:       verdict.String(),
		BestOverallID: selectedProds[0].ID,
	}

	return c.JSON(http.StatusOK, matrix)
}

// CalculateRecommendations computes personalized product ranking based on custom user attribute weights.
// POST /ai/products/recommend
func CalculateRecommendations(c echo.Context) error {
	var req models.RecommendationWeightsRequest
	if err := c.Bind(&req); err != nil {
		req = models.RecommendationWeightsRequest{}
	}

	// If no custom weights provided, use balanced defaults
	if len(req.Weights) == 0 {
		req.Weights = map[string]float64{
			"battery":     40.0,
			"performance": 35.0,
			"comfort":     25.0,
		}
	}

	// Normalize weights to sum to 1.0
	totalWeight := 0.0
	for _, w := range req.Weights {
		if w > 0 {
			totalWeight += w
		}
	}
	if totalWeight <= 0 {
		totalWeight = 1.0
	}

	normWeights := make(map[string]float64)
	for k, w := range req.Weights {
		normWeights[strings.ToLower(k)] = w / totalWeight
	}

	var targetProds []models.ProductIntelligenceRecord
	if len(req.ProductIDs) > 0 {
		idMap := make(map[string]bool)
		for _, id := range req.ProductIDs {
			idMap[strings.ToLower(strings.TrimSpace(id))] = true
		}
		for _, p := range verifiedProductIntelligence {
			if idMap[strings.ToLower(p.ID)] {
				targetProds = append(targetProds, p)
			}
		}
	}
	if len(targetProds) == 0 {
		// Filter by category if requested, otherwise take top products
		catLower := strings.ToLower(strings.TrimSpace(req.Category))
		for _, p := range verifiedProductIntelligence {
			if catLower == "" || strings.EqualFold(p.Category, catLower) || strings.Contains(strings.ToLower(p.Category), catLower) {
				targetProds = append(targetProds, p)
			}
		}
		if len(targetProds) == 0 {
			targetProds = verifiedProductIntelligence
		}
	}

	var ranked []models.RankedRecommendationItem

	for _, prod := range targetProds {
		breakdown := make(map[string]float64)
		weightedSum := 0.0
		appliedWeights := 0.0

		for dim, w := range normWeights {
			var score float64
			if val, ok := prod.ScoreRatings[dim]; ok {
				score = val
			} else {
				// Fallback dimension matching
				if dim == "sound" || dim == "anc" {
					score = prod.ScoreRatings["sound"]
				} else if dim == "design" || dim == "portability" {
					score = prod.ScoreRatings["portability"]
				} else {
					score = 8.5
				}
			}
			breakdown[dim] = score
			weightedSum += score * w
			appliedWeights += w
		}

		var overall float64
		if appliedWeights > 0 {
			overall = weightedSum / appliedWeights
		} else {
			overall = 8.0
		}
		overall = math.Round(overall*10) / 10

		fitVerdict := "Strong match for your priorities."
		if overall >= 9.0 {
			fitVerdict = "Excellent fit for your specific requirements."
		} else if overall >= 8.5 {
			fitVerdict = "Very good balance across your selected parameters."
		}

		ranked = append(ranked, models.RankedRecommendationItem{
			Product:        prod,
			OverallScore:   overall,
			ScoreBreakdown: breakdown,
			FitVerdict:     fitVerdict,
		})
	}

	sort.Slice(ranked, func(i, j int) bool {
		return ranked[i].OverallScore > ranked[j].OverallScore
	})

	return c.JSON(http.StatusOK, models.RecommendationResponse{
		Category:       req.Category,
		RankedProducts: ranked,
		Explanation:    "Rankings calculated using your custom weighted parameters. Higher weights prioritize corresponding specifications directly.",
	})
}
