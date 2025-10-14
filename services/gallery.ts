// services/gallery.ts
import { assignMediaToClaim, listMedia, MediaFilters, MediaItem } from '@/services/media';

export async function loadGallery(limit = 100, filters?: MediaFilters): Promise<MediaItem[]> {
  return listMedia(limit, filters);
}

export async function batchAssign(ids: string[], claimId: string | null) {
  await assignMediaToClaim(ids, claimId);
}
