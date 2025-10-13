import { ScrollView, StyleSheet, View, Text, TextInput, Pressable } from "react-native";
import Header from "../../components/Header";
import Section from "../../components/Section";
import { colors } from "../../theme/colors";

const Item = ({ title, subtitle, tag }: { title: string; subtitle: string; tag: string }) => (
  <Pressable style={styles.card}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
    </View>
  </Pressable>
);

export default function ClaimsScreen() {
  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <Header title="Claims" subtitle="Search, filter, and jump into a file." />
      <View style={styles.searchWrap}>
        <TextInput placeholder="Search claim #, insured, address…" placeholderTextColor="#9AA0A6" style={styles.input} />
      </View>
      <Section title="Open">
        <Item title="Claim #A132 — Jane Doe" subtitle="22 Pinecrest Rd · Hail" tag="Due Today" />
        <Item title="Claim #B221 — Alex Kim" subtitle="9 Lakeview Ave · Water" tag="Scheduled" />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  title: { fontWeight: "600", color: colors.core, marginBottom: 4 },
  sub: { color: "#5F6771" },
  tag: { alignSelf: "flex-start", backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tagText: { color: colors.core, fontSize: 12, fontWeight: "600" }
});
