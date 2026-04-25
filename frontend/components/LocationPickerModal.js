import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from "../config/theme";
import LocationService from "../services/LocationService";
import * as Haptics from "expo-haptics";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const LocationPickerModal = ({ visible, onClose, onSave }) => {
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const loc = LocationService.getLocation();
      setCity(loc.city || "");
      setPincode(loc.pincode || "");
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const detectLocation = async () => {
    try {
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to auto-detect your area.");
        setDetecting(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        setCity(place.city || place.district || place.region || "");
        setPincode(place.postalCode || "");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("[LocationPicker] Error:", error);
      Alert.alert("Error", "Could not detect location. Please enter manually.");
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!pincode || pincode.length < 6) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit pincode.");
      return;
    }

    setLoading(true);
    try {
      // If we detected location, we have coordinates. Otherwise, we just use defaults or previous.
      const currentLoc = LocationService.getLocation();
      await LocationService.setLocation({
        ...currentLoc,
        city,
        pincode,
      });
      onSave && onSave({ city, pincode });
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <Animated.View style={[
          styles.modalContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <BlurView intensity={90} tint="light" style={styles.blurWrap}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  style={styles.gradientIcon}
                >
                  <Ionicons name="location" size={24} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Delivery Location</Text>
                <Text style={styles.subtitle}>Set your delivery pincode</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.inputGroup}>
                <Ionicons name="business-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City (e.g. Bengaluru)"
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="pin-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Pincode (e.g. 560001)"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              <TouchableOpacity 
                style={styles.detectBtn} 
                onPress={detectLocation}
                disabled={detecting}
              >
                {detecting ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detectText}>Use my current location</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveGradient}
                  >
                    <Text style={styles.saveText}>Save Location</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
    ...SHADOWS.lg,
  },
  blurWrap: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    ...SHADOWS.glowSoft,
  },
  gradientIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    ...FONTS.h3,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...FONTS.caption,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: SPACING.md,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 52,
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  detectText: {
    ...FONTS.captionBold,
    color: COLORS.primary,
    fontSize: 14,
  },
  saveBtn: {
    height: 56,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  saveGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    ...FONTS.bodyBold,
    color: "#FFF",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default LocationPickerModal;
