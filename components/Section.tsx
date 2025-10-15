import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

// Renamed from Sections.tsx to Section.tsx for consistency
export default function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleBar}>
        <View style={styles.titleDot} />
        <Text style={styles.h}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  h: { 
    color: colors.primary, 
    fontWeight: "800", 
    fontSize: 17,
    letterSpacing: 0.5,
  },
  body: { 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 12, 
    marginHorizontal: 16, 
    borderWidth: 2, 
    borderColor: colors.light,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }
});

