import { create } from 'zustand';

// Defines the shape of the store's state and the actions to modify it.
interface ClaimState {
  activeClaimId: string | null;
  setActiveClaimId: (id: string | null) => void;
}

/**
 * A global store to manage the currently selected claim ID.
 * This allows different parts of the app (like the Claims list and the Capture tab)
 * to share the same piece of state without passing props.
 */
export const useClaimStore = create<ClaimState>((set) => ({
  activeClaimId: null, // Initially, no claim is selected.
  setActiveClaimId: (id) => set({ activeClaimId: id }),
}));