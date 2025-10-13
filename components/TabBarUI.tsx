import { Platform } from "react-native";
import { IconSymbol } from "expo-symbols"; // iOS SF Symbols
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabBarIcon({
  name,
  color,
  size = 24
}: { name: string; color: string; size?: number }) {
  // On iOS use SF Symbols via expo-symbols; fallback to Ionicons elsewhere
  if (Platform.OS === "ios") {
    return <IconSymbol name={name as any} size={size} color={color} />;
  }
  return <Ionicons name={"ellipse"} size={size} color={color} />;
}
