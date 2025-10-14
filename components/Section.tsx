import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

// Renamed from Sections.tsx to Section.tsx for consistency
export default function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  h: { color: colors.core, fontWeight: "700", marginHorizontal: 16, marginBottom: 8 },
  body: { backgroundColor: colors.white, borderRadius: 16, padding: 12, marginHorizontal: 16, borderWidth: 1, borderColor: colors.line }
});

