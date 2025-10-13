import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "700", color: colors.core },
  sub: { color: "#5F6771", marginTop: 4 }
});
