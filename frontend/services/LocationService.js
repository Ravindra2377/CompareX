import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_STORAGE_KEY = "@CompareZ_location";

// Default: Bangalore coordinates
const DEFAULT_LOCATION = {
  latitude: 12.9716,
  longitude: 77.5946,
  city: "Bengaluru",
  pincode: "560001",
};

class LocationService {
  constructor() {
    this._location = null;
    this._loaded = false;
  }

  async init() {
    if (this._loaded) return this._location;
    try {
      const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        this._location = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("[LocationService] Failed to load stored location:", e);
    }
    this._loaded = true;
    return this._location || DEFAULT_LOCATION;
  }

  getLocation() {
    return this._location || DEFAULT_LOCATION;
  }

  async setLocation(location) {
    this._location = {
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city || "",
      pincode: location.pincode || "",
    };
    try {
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify(this._location)
      );
    } catch (e) {
      console.warn("[LocationService] Failed to persist location:", e);
    }
    return this._location;
  }

  /**
   * Returns JS to inject BEFORE page content loads.
   * Overrides navigator.geolocation so platforms auto-detect delivery area.
   */
  getGeolocationInjectionScript() {
    const loc = this.getLocation();
    return `
      (function() {
        var lat = ${loc.latitude};
        var lng = ${loc.longitude};
        
        // Override geolocation API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition = function(success, error, options) {
            if (success) {
              success({
                coords: {
                  latitude: lat,
                  longitude: lng,
                  accuracy: 10,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              });
            }
          };
          navigator.geolocation.watchPosition = function(success, error, options) {
            if (success) {
              success({
                coords: {
                  latitude: lat,
                  longitude: lng,
                  accuracy: 10,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              });
            }
            return 1;
          };
          navigator.geolocation.clearWatch = function() {};
        }
        true;
      })();
    `;
  }

  /**
   * Returns platform-specific localStorage/cookie injection to pre-set delivery location.
   * This runs BEFORE the page loads so the platform sees the location immediately.
   */
  getPlatformLocationScript(platform) {
    const loc = this.getLocation();
    const lat = loc.latitude;
    const lng = loc.longitude;
    const city = loc.city || "Bengaluru";
    const pincode = loc.pincode || "560001";

    switch (platform) {
      case "Blinkit":
        return `
          (function() {
            try {
              var blinkitLoc = {
                latitude: ${lat},
                longitude: ${lng},
                address: "${city}",
                city: "${city}",
                pincode: "${pincode}",
                place_id: "blinkit_auto"
              };
              var locStr = JSON.stringify(blinkitLoc);
              localStorage.setItem('__blinkit_location__', locStr);
              localStorage.setItem('__blinkit_hc_location__', locStr);
              localStorage.setItem('location', locStr);
              localStorage.setItem('lat', '${lat}');
              localStorage.setItem('lng', '${lng}');
              localStorage.setItem('isLocationPresent', 'true');
              document.cookie = "gr_1_lat=${lat};path=/;max-age=86400";
              document.cookie = "gr_1_lng=${lng};path=/;max-age=86400";
              document.cookie = "gr_1_locality=${city};path=/;max-age=86400";
            } catch(e) {}
            true;
          })();
        `;

      case "Zepto":
        return `
          (function() {
            try {
              var zeptoLoc = {
                lat: ${lat},
                lng: ${lng},
                city: "${city}",
                pincode: "${pincode}",
                address: "${city}"
              };
              localStorage.setItem('user-position', JSON.stringify(zeptoLoc));
              localStorage.setItem('userPosition', JSON.stringify(zeptoLoc));
              document.cookie = "user_lat=${lat};path=/;max-age=86400";
              document.cookie = "user_lng=${lng};path=/;max-age=86400";
            } catch(e) {}
            true;
          })();
        `;

      case "BigBasket":
        return `
          (function() {
            try {
              document.cookie = "bb_lat=${lat};path=/;max-age=86400";
              document.cookie = "bb_lng=${lng};path=/;max-age=86400";
              document.cookie = "_bb_pin=${pincode};path=/;max-age=86400";
              document.cookie = "bb_city=${city};path=/;max-age=86400";
              localStorage.setItem('bb_location', JSON.stringify({
                lat: ${lat}, lng: ${lng}, city: "${city}", pincode: "${pincode}"
              }));
            } catch(e) {}
            true;
          })();
        `;

      case "Amazon":
        return `
          (function() {
            try {
              document.cookie = "ubid-acbin=;path=/;max-age=86400";
              document.cookie = "session-id=;path=/;max-age=86400";
              localStorage.setItem('pincode', '${pincode}');
            } catch(e) {}
            true;
          })();
        `;

      case "Flipkart":
        return `
          (function() {
            try {
              document.cookie = "vp=${pincode};path=/;max-age=86400";
              localStorage.setItem('pincode', '${pincode}');
            } catch(e) {}
            true;
          })();
        `;

      default:
        return "true;";
    }
  }

  /**
   * Combined injection script (geolocation override + platform location cookies).
   * Use as `injectedJavaScriptBeforeContentLoaded` in WebView.
   */
  getFullInjectionScript(platform) {
    return (
      this.getGeolocationInjectionScript() +
      this.getPlatformLocationScript(platform)
    );
  }
}

export default new LocationService();
