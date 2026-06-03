import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SOCIAL_COLORS } from "./socialTheme";

export const UserNotAvailable: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(main)/(tabs)/discover" as any);
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: SOCIAL_COLORS.page,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
      <StatusBar style="light" />

      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          borderWidth: 1,
          borderColor: "rgba(239, 68, 68, 0.2)",
        }}>
        <Feather name="slash" size={40} color="#ef4444" />
      </View>

      <Text
        style={{
          color: SOCIAL_COLORS.text,
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12,
          textAlign: "center",
        }}>
        Trang cá nhân không khả dụng
      </Text>

      <Text
        style={{
          color: SOCIAL_COLORS.textMuted,
          fontSize: 15,
          textAlign: "center",
          marginBottom: 32,
          lineHeight: 22,
        }}>
        Liên kết này có thể đã bị hỏng hoặc trang cá nhân đã bị gỡ. Vui lòng
        kiểm tra lại đường dẫn mà bạn đang cố mở.
      </Text>

      <TouchableOpacity
        style={{
          width: "100%",
          paddingVertical: 14,
          backgroundColor: SOCIAL_COLORS.primary,
          borderRadius: 12,
          alignItems: "center",
        }}
        activeOpacity={0.8}
        onPress={() => router.replace("/(main)/social" as any)}>
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
          Trở về Bảng tin
        </Text>
      </TouchableOpacity>
    </View>
  );
};
