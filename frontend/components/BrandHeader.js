import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "./Icon";
import ScreenHeader from "./ScreenHeader";
import LocationPickerModal from "./LocationPickerModal";
import LocationService from "../services/LocationService";
import { FONTS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";

export default function BrandHeader({
  city: controlledCity,
  pincode: controlledPincode,
  onLocationPress,
  onLocationSave,
  editorial = false,
  backgroundColor,
  showBack = false,
  onBackPress,
  rightComponent,
}) {
  const { themeColors } = useTheme();
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  useEffect(() => {
    if (controlledCity !== undefined || controlledPincode !== undefined) return;

    LocationService.init().then((location) => {
      if (!location) return;
      setCity(location.city || "");
      setPincode(location.pincode || "");
    });
  }, [controlledCity, controlledPincode]);

  const displayCity = controlledCity !== undefined ? controlledCity : city;
  const displayPincode =
    controlledPincode !== undefined ? controlledPincode : pincode;

  const openLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onLocationPress) {
      onLocationPress();
      return;
    }
    setLocationModalVisible(true);
  };

  return (
    <>
      <ScreenHeader
        leftAlign
        showBack={showBack}
        onBackPress={onBackPress}
        rightComponent={rightComponent}
        backgroundColor={backgroundColor || themeColors.paper}
        style={{ borderBottomWidth: 0 }}
        centerComponent={
          <View>
            <Text
              style={[
                editorial ? FONTS.editorialBold : FONTS.heading,
                {
                  fontSize: editorial ? 30 : 22,
                  color: themeColors.ink,
                  letterSpacing: editorial ? -1 : -0.5,
                },
              ]}
            >
              CompareZ
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 2,
              }}
              onPress={openLocation}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location"
                size={12}
                color={themeColors.inkSoft}
              />
              <Text
                style={[
                  FONTS.uiBody,
                  {
                    color: themeColors.inkSoft,
                    fontSize: 13,
                    marginLeft: 4,
                    marginRight: 4,
                  },
                ]}
              >
                {displayCity
                  ? `${displayCity}${displayPincode ? ` ${displayPincode}` : ""}`
                  : "Set Location"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={themeColors.inkFaint}
              />
            </TouchableOpacity>
          </View>
        }
      />
      {!onLocationPress ? (
        <LocationPickerModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
          onSave={(location) => {
            setCity(location.city || "");
            setPincode(location.pincode || "");
            onLocationSave?.(location);
          }}
        />
      ) : null}
    </>
  );
}
