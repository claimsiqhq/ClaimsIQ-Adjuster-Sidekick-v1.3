// Enterprise-grade global state management with Zustand
// Comprehensive state for ClaimsIQ Adjuster Sidekick

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

// ==================== TYPE DEFINITIONS ====================

export interface Claim {
  id: string;
  claim_number: string;
  insured_name?: string;
  loss_location?: string;
  loss_date?: string;
  status?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  claim_id?: string;
  type: 'photo' | 'lidar_room';
  status: 'pending' | 'uploading' | 'annotating' | 'done' | 'error';
  label?: string;
  storage_path: string;
  anno_count?: number;
  created_at: string;
}

export interface Document {
  id: string;
  claim_id?: string;
  document_type: string;
  file_name: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
}

export interface SyncOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: any;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface UserSettings {
  unit_system: 'imperial' | 'metric';
  dark_mode: boolean;
  wifi_only_sync: boolean;
  annotation_embedding: boolean;
  photo_quality: 'high' | 'medium' | 'low';
}

export interface AppError {
  id: string;
  message: string;
  code?: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
}

// ==================== STATE INTERFACE ====================

interface AppState {
  // ========== Authentication ==========
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // ========== Claims ==========
  claims: Claim[];
  activeClaim: Claim | null;
  claimsLoading: boolean;
  claimsError: string | null;

  // ========== Media ==========
  media: Media[];
  selectedMedia: string[];  // IDs of selected media for bulk operations
  mediaLoading: boolean;

  // ========== Documents ==========
  documents: Document[];
  documentsLoading: boolean;

  // ========== Network & Sync ==========
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingSyncOps: SyncOperation[];
  lastSyncTime: string | null;

  // ========== UI State ==========
  isLoading: boolean;  // Global loading state
  errors: AppError[];  // Stack of errors
  notifications: string[];  // Toast notifications

  // ========== Settings ==========
  settings: UserSettings;

  // ========== Cache ==========
  cacheTimestamps: Record<string, number>;  // Track when data was last fetched

  // ==================== AUTH ACTIONS ====================

  setSession: (session: Session | null, user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  // ==================== CLAIMS ACTIONS ====================

  setClaims: (claims: Claim[]) => void;
  addClaim: (claim: Claim) => void;
  updateClaim: (id: string, updates: Partial<Claim>) => void;
  removeClaim: (id: string) => void;
  setActiveClaim: (claim: Claim | null) => void;
  setClaimsLoading: (loading: boolean) => void;
  setClaimsError: (error: string | null) => void;

  // ==================== MEDIA ACTIONS ====================

  setMedia: (media: Media[]) => void;
  addMedia: (media: Media) => void;
  updateMedia: (id: string, updates: Partial<Media>) => void;
  removeMedia: (id: string) => void;
  setSelectedMedia: (ids: string[]) => void;
  toggleMediaSelection: (id: string) => void;
  clearMediaSelection: () => void;
  setMediaLoading: (loading: boolean) => void;

  // ==================== DOCUMENTS ACTIONS ====================

  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  setDocumentsLoading: (loading: boolean) => void;

  // ==================== NETWORK & SYNC ACTIONS ====================

  setOnlineStatus: (isOnline: boolean) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  addSyncOperation: (op: SyncOperation) => void;
  removeSyncOperation: (id: string) => void;
  clearSyncOperations: () => void;
  setLastSyncTime: (time: string) => void;

  // ==================== UI ACTIONS ====================

  setLoading: (loading: boolean) => void;
  addError: (error: AppError) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  addNotification: (message: string) => void;
  removeNotification: (index: number) => void;
  clearNotifications: () => void;

  // ==================== SETTINGS ACTIONS ====================

  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;

  // ==================== CACHE ACTIONS ====================

  setCacheTimestamp: (key: string, timestamp: number) => void;
  isCacheStale: (key: string, maxAge: number) => boolean;
  clearCache: () => void;

  // ==================== UTILITY ACTIONS ====================

  reset: () => void;  // Reset entire store to initial state
}

// ==================== INITIAL STATE ====================

const initialState = {
  // Auth
  session: null,
  user: null,
  isAuthenticated: false,
  authLoading: true,

  // Claims
  claims: [],
  activeClaim: null,
  claimsLoading: false,
  claimsError: null,

  // Media
  media: [],
  selectedMedia: [],
  mediaLoading: false,

  // Documents
  documents: [],
  documentsLoading: false,

  // Network & Sync
  isOnline: true,
  syncStatus: 'idle' as const,
  pendingSyncOps: [],
  lastSyncTime: null,

  // UI
  isLoading: false,
  errors: [],
  notifications: [],

  // Settings
  settings: {
    unit_system: 'imperial' as const,
    dark_mode: false,
    wifi_only_sync: false,
    annotation_embedding: true,
    photo_quality: 'high' as const,
  },

  // Cache
  cacheTimestamps: {},
};

// ==================== STORE CREATION ====================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== AUTH ACTIONS ==========

      setSession: (session, user) =>
        set({
          session,
          user,
          isAuthenticated: !!session,
          authLoading: false,
        }),

      setAuthLoading: (loading) => set({ authLoading: loading }),

      logout: () =>
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          claims: [],
          activeClaim: null,
          media: [],
          documents: [],
        }),

      // ========== CLAIMS ACTIONS ==========

      setClaims: (claims) => set({ claims }),

      addClaim: (claim) =>
        set((state) => ({
          claims: [claim, ...state.claims],
        })),

      updateClaim: (id, updates) =>
        set((state) => ({
          claims: state.claims.map((claim) =>
            claim.id === id ? { ...claim, ...updates } : claim
          ),
          activeClaim:
            state.activeClaim?.id === id
              ? { ...state.activeClaim, ...updates }
              : state.activeClaim,
        })),

      removeClaim: (id) =>
        set((state) => ({
          claims: state.claims.filter((claim) => claim.id !== id),
          activeClaim: state.activeClaim?.id === id ? null : state.activeClaim,
        })),

      setActiveClaim: (claim) => set({ activeClaim: claim }),

      setClaimsLoading: (loading) => set({ claimsLoading: loading }),

      setClaimsError: (error) => set({ claimsError: error }),

      // ========== MEDIA ACTIONS ==========

      setMedia: (media) => set({ media }),

      addMedia: (media) =>
        set((state) => ({
          media: [media, ...state.media],
        })),

      updateMedia: (id, updates) =>
        set((state) => ({
          media: state.media.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeMedia: (id) =>
        set((state) => ({
          media: state.media.filter((m) => m.id !== id),
          selectedMedia: state.selectedMedia.filter((mid) => mid !== id),
        })),

      setSelectedMedia: (ids) => set({ selectedMedia: ids }),

      toggleMediaSelection: (id) =>
        set((state) => ({
          selectedMedia: state.selectedMedia.includes(id)
            ? state.selectedMedia.filter((mid) => mid !== id)
            : [...state.selectedMedia, id],
        })),

      clearMediaSelection: () => set({ selectedMedia: [] }),

      setMediaLoading: (loading) => set({ mediaLoading: loading }),

      // ========== DOCUMENTS ACTIONS ==========

      setDocuments: (documents) => set({ documents }),

      addDocument: (document) =>
        set((state) => ({
          documents: [document, ...state.documents],
        })),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, ...updates } : doc
          ),
        })),

      setDocumentsLoading: (loading) => set({ documentsLoading: loading }),

      // ========== NETWORK & SYNC ACTIONS ==========

      setOnlineStatus: (isOnline) => set({ isOnline }),

      setSyncStatus: (status) => set({ syncStatus: status }),

      addSyncOperation: (op) =>
        set((state) => ({
          pendingSyncOps: [...state.pendingSyncOps, op],
        })),

      removeSyncOperation: (id) =>
        set((state) => ({
          pendingSyncOps: state.pendingSyncOps.filter((op) => op.id !== id),
        })),

      clearSyncOperations: () => set({ pendingSyncOps: [] }),

      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // ========== UI ACTIONS ==========

      setLoading: (loading) => set({ isLoading: loading }),

      addError: (error) =>
        set((state) => ({
          errors: [...state.errors, error],
        })),

      removeError: (id) =>
        set((state) => ({
          errors: state.errors.filter((err) => err.id !== id),
        })),

      clearErrors: () => set({ errors: [] }),

      addNotification: (message) =>
        set((state) => ({
          notifications: [...state.notifications, message],
        })),

      removeNotification: (index) =>
        set((state) => ({
          notifications: state.notifications.filter((_, i) => i !== index),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // ========== SETTINGS ACTIONS ==========

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetSettings: () =>
        set({
          settings: initialState.settings,
        }),

      // ========== CACHE ACTIONS ==========

      setCacheTimestamp: (key, timestamp) =>
        set((state) => ({
          cacheTimestamps: { ...state.cacheTimestamps, [key]: timestamp },
        })),

      isCacheStale: (key, maxAge) => {
        const timestamp = get().cacheTimestamps[key];
        if (!timestamp) return true;
        return Date.now() - timestamp > maxAge;
      },

      clearCache: () => set({ cacheTimestamps: {} }),

      // ========== UTILITY ACTIONS ==========

      reset: () => set(initialState),
    }),
    {
      name: 'claimsiq-storage',  // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        settings: state.settings,
        cacheTimestamps: state.cacheTimestamps,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// ==================== SELECTOR HOOKS ====================
// These provide optimized access to specific slices of state

export const useAuth = () => useAppStore((state) => ({
  session: state.session,
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  authLoading: state.authLoading,
  setSession: state.setSession,
  setAuthLoading: state.setAuthLoading,
  logout: state.logout,
}));

export const useClaims = () => useAppStore((state) => ({
  claims: state.claims,
  activeClaim: state.activeClaim,
  claimsLoading: state.claimsLoading,
  claimsError: state.claimsError,
  setClaims: state.setClaims,
  addClaim: state.addClaim,
  updateClaim: state.updateClaim,
  removeClaim: state.removeClaim,
  setActiveClaim: state.setActiveClaim,
  setClaimsLoading: state.setClaimsLoading,
  setClaimsError: state.setClaimsError,
}));

export const useMediaState = () => useAppStore((state) => ({
  media: state.media,
  selectedMedia: state.selectedMedia,
  mediaLoading: state.mediaLoading,
  setMedia: state.setMedia,
  addMedia: state.addMedia,
  updateMedia: state.updateMedia,
  removeMedia: state.removeMedia,
  setSelectedMedia: state.setSelectedMedia,
  toggleMediaSelection: state.toggleMediaSelection,
  clearMediaSelection: state.clearMediaSelection,
  setMediaLoading: state.setMediaLoading,
}));

export const useSync = () => useAppStore((state) => ({
  isOnline: state.isOnline,
  syncStatus: state.syncStatus,
  pendingSyncOps: state.pendingSyncOps,
  lastSyncTime: state.lastSyncTime,
  setOnlineStatus: state.setOnlineStatus,
  setSyncStatus: state.setSyncStatus,
  addSyncOperation: state.addSyncOperation,
  removeSyncOperation: state.removeSyncOperation,
  clearSyncOperations: state.clearSyncOperations,
  setLastSyncTime: state.setLastSyncTime,
}));

export const useUI = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  errors: state.errors,
  notifications: state.notifications,
  setLoading: state.setLoading,
  addError: state.addError,
  removeError: state.removeError,
  clearErrors: state.clearErrors,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));

export const useSettings = () => useAppStore((state) => ({
  settings: state.settings,
  updateSettings: state.updateSettings,
  resetSettings: state.resetSettings,
}));
