// Integration hook to connect Zustand state with Supabase services
// Provides a clean API for loading and managing claims data

import { useEffect } from 'react';
import { useClaims } from '@/store/useAppStore';
import { getClaims, getClaimById } from '@/services/claims';
import { getSession } from '@/services/auth';

export function useClaimsData() {
  const {
    claims,
    activeClaim,
    claimsLoading,
    claimsError,
    setClaims,
    addClaim,
    updateClaim,
    removeClaim,
    setActiveClaim,
    setClaimsLoading,
    setClaimsError,
  } = useClaims();

  // Load claims on mount
  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    try {
      setClaimsLoading(true);
      setClaimsError(null);

      const session = await getSession();
      if (!session) {
        setClaimsError('Not authenticated');
        return;
      }

      const userId = session.user.id;
      const fetchedClaims = await getClaims(userId);

      setClaims(fetchedClaims);
    } catch (error: any) {
      console.error('Load claims error:', error);
      setClaimsError(error.message || 'Failed to load claims');
    } finally {
      setClaimsLoading(false);
    }
  }

  async function refreshClaims() {
    await loadClaims();
  }

  async function loadClaimById(id: string) {
    try {
      const claim = await getClaimById(id);
      if (claim) {
        // Update in list if exists, otherwise add
        const existingIndex = claims.findIndex((c) => c.id === id);
        if (existingIndex >= 0) {
          updateClaim(id, claim);
        } else {
          addClaim(claim);
        }
        setActiveClaim(claim);
      }
      return claim;
    } catch (error: any) {
      console.error('Load claim by ID error:', error);
      throw error;
    }
  }

  return {
    claims,
    activeClaim,
    claimsLoading,
    claimsError,
    loadClaims,
    refreshClaims,
    loadClaimById,
    setActiveClaim,
    updateClaim,
    addClaim,
    removeClaim,
  };
}
