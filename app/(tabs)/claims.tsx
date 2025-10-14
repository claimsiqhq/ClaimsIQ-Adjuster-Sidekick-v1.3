import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from "react-native";
import Header from "../../components/Header";
import Section from "../../components/Section";
import { colors } from "../../theme/colors";
import { listClaimsLike, Claim } from "../../services/claims";
import { useRouter } from "expo-router";

const Item = ({ claim, onPress }: { claim: Claim; onPress: () => void }) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Claim #{claim.claim_number || '(unnamed)'}</Text>
      <Text style={styles.sub}>{new Date(claim.created_at).toLocaleDateString()}</Text>
    </View>
  </Pressable>
);

export default function ClaimsScreen() {
  const [query, setQuery] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function loadClaims(searchQuery = '') {
    try {
      setLoading(true);
      const results = await listClaimsLike(searchQuery, 50);
      setClaims(results);
    } catch (e) {
      console.error('Failed to load claims:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadClaims(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <Header title="Claims" subtitle="Search, filter, and jump into a file." />
      <View style={styles.searchWrap}>
        <TextInput 
          placeholder="Search claim #, insured, address…" 
          placeholderTextColor="#9AA0A6" 
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <Section title={loading ? "Loading..." : `Claims (${claims.length})`}>
        {loading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : claims.length === 0 ? (
          <Text style={styles.sub}>No claims found. Start by assigning photos to a claim.</Text>
        ) : (
          claims.map((claim) => (
            <Item 
              key={claim.id} 
              claim={claim} 
              onPress={() => {
                // TODO: Navigate to claim detail screen
                console.log('View claim:', claim.id);
              }}
            />
          ))
        )}
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
