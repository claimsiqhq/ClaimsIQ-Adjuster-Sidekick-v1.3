import { View, Text, StyleSheet, Pressable } from "react-native";
import Header from "../../components/Header";
import Section from "../../components/Section";
import { colors } from "../../theme/colors";

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Header title="Map & Route" subtitle="Stops, ETAs, traffic." />
      <View style={styles.mapPlaceholder}><Text style={{ color: "#9AA0A6" }}>[ Map placeholder ]</Text></View>
      <Section title="Stops (Today)">
        <Text style={styles.li}>• 22 Pinecrest Rd — ETA 09:30</Text>
        <Text style={styles.li}>• 9 Lakeview Ave — ETA 12:15</Text>
        <Pressable style={styles.cta}><Text style={styles.ctaText}>Notify Client ETAs</Text></Pressable>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  mapPlaceholder: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, height: 220, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  li: { color: "#2B2F36", marginBottom: 6 },
  cta: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 8 },
  ctaText: { color: colors.white, fontWeight: "600" }
});
