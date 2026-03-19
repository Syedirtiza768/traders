/**
 * useQuickAdd
 *
 * Generic hook that manages the Quick Add modal lifecycle:
 *  - open/close state
 *  - entity type tracking
 *  - post-creation callback to inject new option & auto-select
 *
 * Usage:
 *   const quickAdd = useQuickAdd();
 *   // Open: quickAdd.open('customer')
 *   // In modal: quickAdd.onCreated({ label, value }) to close + inject
 */

import { useCallback, useState } from 'react';
import type { SelectOption } from './SearchableSelect';

export type QuickAddEntity = 'customer' | 'supplier' | 'item';

type QuickAddState = {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Which entity type is being created */
  entityType: QuickAddEntity | null;
  /** Pre-fill hint (e.g. the search query the user typed before clicking + Add New) */
  prefill: string;
};

type UseQuickAddReturn = {
  /** Current modal state */
  state: QuickAddState;
  /** Open the Quick Add modal for a given entity type, optionally with a prefill string */
  open: (entity: QuickAddEntity, prefill?: string) => void;
  /** Close the modal without creating anything */
  close: () => void;
  /**
   * Call after the entity was successfully created via API.
   * Injects the new option into the provided setter and auto-selects it.
   */
  onCreated: (
    newOption: SelectOption,
    optionsSetter: React.Dispatch<React.SetStateAction<any[]>>,
    valueSetter: (value: string) => void,
    rawEntity?: any,
  ) => void;
};

export default function useQuickAdd(): UseQuickAddReturn {
  const [state, setState] = useState<QuickAddState>({
    isOpen: false,
    entityType: null,
    prefill: '',
  });

  const open = useCallback((entity: QuickAddEntity, prefill = '') => {
    setState({ isOpen: true, entityType: entity, prefill });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, entityType: null, prefill: '' });
  }, []);

  const onCreated = useCallback(
    (
      newOption: SelectOption,
      optionsSetter: React.Dispatch<React.SetStateAction<any[]>>,
      valueSetter: (value: string) => void,
      rawEntity?: any,
    ) => {
      // Inject the new entity into the parent list so the dropdown immediately shows it
      if (rawEntity) {
        optionsSetter((prev) => [rawEntity, ...prev]);
      }
      // Auto-select the newly created entity
      valueSetter(newOption.value);
      // Close the modal
      close();
    },
    [close],
  );

  return { state, open, close, onCreated };
}
