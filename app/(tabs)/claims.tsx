import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator, FlatList, RefreshControl } from "react-native";
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
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  async function loadClaims(searchQuery = '', refresh = false) {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Check if Supabase is configured
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY) {
        console.error('Supabase not configured - cannot load claims');
        setClaims([]);
        return;
      }
      
      let results = await listClaimsLike(searchQuery, 50);
      
      // Apply status filter
      if (statusFilter !== 'all') {
        results = results.filter(c => c.status === statusFilter);
      }
      
      setClaims(results);
    } catch (e: any) {
      console.error('Failed to load claims:', e);
      // If it's a Supabase configuration error, just set empty claims
      if (e?.message?.includes('Supabase is not configured')) {
        setClaims([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    <ScrollView 
      style={styles.container} 
      contentInsetAdjustmentBehavior="automatic" 
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadClaims(query, true)} />
      }
    >
      <Header title="Claims" subtitle="Search, filter, and jump into a file." />
      
      {/* Status Filter */}
      <View style={styles.filterRow}>
        {['all', 'open', 'in_progress', 'completed', 'closed'].map(status => (
          <Pressable
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => {
              setStatusFilter(status);
              loadClaims(query);
            }}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {status.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      
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
          !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY ? (
            <View style={{ padding: 16, backgroundColor: '#FFF5F5', borderRadius: 10, borderWidth: 1, borderColor: '#FED7D7' }}>
              <Text style={{ color: '#C53030', fontWeight: '600', marginBottom: 4 }}>⚠️ Supabase not configured</Text>
              <Text style={{ color: '#742A2A', fontSize: 12 }}>
                Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY to your .env file
              </Text>
            </View>
          ) : (
            <Text style={styles.sub}>No claims found. Start by assigning photos to a claim.</Text>
          )
        ) : (
          claims.map((claim) => (
            <Item 
              key={claim.id} 
              claim={claim} 
              onPress={() => router.push(`/claim/${claim.id}`)}
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
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.core },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 16, borderWidth: 2, borderLeftWidth: 4, borderLeftColor: colors.primary, borderColor: colors.light, marginBottom: 10 },
  title: { fontWeight: "600", color: colors.core, marginBottom: 4 },
  sub: { color: colors.textLight },
  tag: { alignSelf: "flex-start", backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tagText: { color: colors.core, fontSize: 12, fontWeight: "600" },
  filterRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingBottom: 12, 
    gap: 8, 
    flexWrap: 'wrap' 
  },
  filterChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: colors.line, 
    backgroundColor: colors.white 
  },
  filterChipActive: { 
    backgroundColor: colors.primary, 
    borderColor: colors.primary 
  },
  filterText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: colors.core, 
    textTransform: 'capitalize' 
  },
  filterTextActive: { 
    color: colors.white 
  }
});
