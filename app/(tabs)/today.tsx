import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import Header from "../../components/Header";
import Section from "../../components/Section";
import { colors } from "../../theme/colors";

export default function TodayScreen() {
  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Header title="Today" subtitle="Route, weather, and SLA watchlist." />
      <Section title="Route Overview">
        <Text style={styles.p}>3 visits · 42 km · ETA 6:10 PM</Text>
        <Pressable style={styles.cta}><Text style={styles.ctaText}>Start Day</Text></Pressable>
      </Section>
      <Section title="Weather Heads-Up">
        <Text style={styles.p}>Wind gusts 28 mph after 2pm. Do roof earlier; bring harness.</Text>
      </Section>
      <Section title="SLA Watchlist">
        <Text style={styles.li}>• Claim #A132 due today</Text>
        <Text style={styles.li}>• Claim #B221 due tomorrow</Text>
      </Section>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  p: { color: "#2B2F36", marginBottom: 8 },
  li: { color: "#2B2F36", marginBottom: 6 },
  cta: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 8 },
  ctaText: { color: colors.white, fontWeight: "600" }
});
