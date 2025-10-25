// Improved Claims Screen with Search, Filters, and Sorting
// Replace claims.tsx with this file

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/Header';
import SearchBar from '@/components/ui/SearchBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { textStyles } from '@/theme/typography';
import { useClaimsData } from '@/hooks/useClaimsData';

type ClaimStatus = 'all' | 'open' | 'in_progress' | 'completed' | 'closed';
type SortBy = 'recent' | 'claim_number' | 'loss_date' | 'status';

const STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'claim_number', label: 'Claim Number' },
  { value: 'loss_date', label: 'Loss Date' },
  { value: 'status', label: 'Status' },
];

export default function ClaimsScreen() {
  const router = useRouter();
  const { claims, claimsLoading, refreshClaims } = useClaimsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort claims
  const filteredClaims = useMemo(() => {
    let result = [...claims];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (claim) =>
          claim.claim_number?.toLowerCase().includes(query) ||
          claim.insured_name?.toLowerCase().includes(query) ||
          claim.loss_location?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((claim) => claim.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'claim_number':
          return (a.claim_number || '').localeCompare(b.claim_number || '');
        case 'loss_date':
          return (
            new Date(b.loss_date || 0).getTime() -
            new Date(a.loss_date || 0).getTime()
          );
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return result;
  }, [claims, searchQuery, statusFilter, sortBy]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open':
        return colors.info;
      case 'in_progress':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'closed':
        return colors.textLight;
      default:
        return colors.textMuted;
    }
  };

  const renderClaimCard = ({ item }: { item: any }) => (
    <Card
      onPress={() => router.push(`/claim/${item.id}`)}
      style={styles.claimCard}
    >
      <View style={styles.claimHeader}>
        <View style={styles.claimHeaderLeft}>
          <Text style={styles.claimNumber}>#{item.claim_number || 'N/A'}</Text>
          {item.status && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ]}
              >
                {item.status}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>

      {item.insured_name && (
        <Text style={styles.insuredName}>{item.insured_name}</Text>
      )}

      {item.loss_location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.textLight} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.loss_location}
          </Text>
        </View>
      )}

      {item.loss_date && (
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textLight} />
          <Text style={styles.dateText}>
            {new Date(item.loss_date).toLocaleDateString()}
          </Text>
        </View>
      )}
    </Card>
  );

  const renderEmpty = () => {
    if (claimsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading claims...</Text>
        </View>
      );
    }

    if (searchQuery || statusFilter !== 'all') {
      return (
        <EmptyState
          icon="search-outline"
          title="No Claims Found"
          message="Try adjusting your search or filters"
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
          }}
        />
      );
    }

    return (
      <EmptyState
        icon="folder-open-outline"
        title="No Claims Yet"
        message="Upload an FNOL document to create your first claim"
        actionLabel="Upload FNOL"
        onAction={() => router.push('/document/upload')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Claims" subtitle={`${filteredClaims.length} claims`} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by claim #, name, or location"
        />
        <Pressable
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'funnel' : 'funnel-outline'}
            size={20}
            color={showFilters ? colors.primary : colors.textLight}
          />
        </Pressable>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterChips}>
            {STATUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterChip,
                  statusFilter === option.value && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.filterChips}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterChip,
                  sortBy === option.value && styles.filterChipActive,
                ]}
                onPress={() => setSortBy(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Claims List */}
      <FlatList
        data={filteredClaims}
        renderItem={renderClaimCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        onRefresh={refreshClaims}
        refreshing={claimsLoading}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Create Claim */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/document/upload')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  filterLabel: {
    ...textStyles.label,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...textStyles.bodySmall,
    color: colors.textLight,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  claimCard: {
    marginBottom: spacing.md,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  claimHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  claimNumber: {
    ...textStyles.h4,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...textStyles.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  insuredName: {
    ...textStyles.body,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationText: {
    ...textStyles.bodySmall,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dateText: {
    ...textStyles.bodySmall,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    ...textStyles.body,
    marginTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl + spacing.bottomSafe,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
