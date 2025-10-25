// Integration hook for media data with Zustand state

import { useEffect } from 'react';
import { useMediaState } from '@/store/useAppStore';
import { listMedia } from '@/services/media';

export function useMediaData(filters?: { claimId?: string; type?: string; status?: string }) {
  const {
    media,
    selectedMedia,
    mediaLoading,
    setMedia,
    addMedia,
    updateMedia,
    removeMedia,
    setMediaLoading,
    toggleMediaSelection,
    clearMediaSelection,
  } = useMediaState();

  // Load media on mount or when filters change
  useEffect(() => {
    loadMedia();
  }, [filters?.claimId, filters?.type, filters?.status]);

  async function loadMedia() {
    try {
      setMediaLoading(true);

      const fetchedMedia = await listMedia(50, filters);
      setMedia(fetchedMedia);
    } catch (error: any) {
      console.error('Load media error:', error);
    } finally {
      setMediaLoading(false);
    }
  }

  async function refreshMedia() {
    await loadMedia();
  }

  return {
    media,
    selectedMedia,
    mediaLoading,
    loadMedia,
    refreshMedia,
    addMedia,
    updateMedia,
    removeMedia,
    toggleMediaSelection,
    clearMediaSelection,
  };
}
