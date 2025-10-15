import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.accent} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  title: { 
    fontSize: 26, 
    fontWeight: "800", 
    color: colors.primary,
    marginBottom: 4,
  },
  sub: { 
    color: colors.secondary, 
    fontSize: 14,
    fontWeight: '600',
  }
});
