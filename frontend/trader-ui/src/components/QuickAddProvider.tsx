/**
 * QuickAddProvider
 *
 * A single drop-in component that renders the QuickAddModal + the correct
 * entity form based on the current hook state. Place it once in any page
 * that needs Quick Add support:
 *
 *   const quickAdd = useQuickAdd();
 *   ...
 *   <QuickAddProvider
 *     quickAdd={quickAdd}
 *     customersSetter={setCustomers}
 *     customerValueSetter={setCustomer}
 *     suppliersSetter={setSuppliers}
 *     supplierValueSetter={setSupplier}
 *     itemsSetter={setItems}
 *     itemValueSetter={(v) => handleItemChange(activeLineIndex, v)}
 *   />
 *
 * Only pass the setter pairs for entity types that the page actually uses.
 */

import QuickAddModal from './QuickAddModal';
import {
  QuickAddCustomerForm,
  QuickAddItemForm,
  QuickAddSupplierForm,
} from './QuickAddForms';
import type { SelectOption } from './SearchableSelect';
import type { QuickAddEntity } from './useQuickAdd';

type QuickAddState = {
  isOpen: boolean;
  entityType: QuickAddEntity | null;
  prefill: string;
};

type Props = {
  quickAdd: {
    state: QuickAddState;
    close: () => void;
    onCreated: (
      option: SelectOption,
      setter: React.Dispatch<React.SetStateAction<any[]>>,
      valueSetter: (value: string) => void,
      raw?: any,
    ) => void;
  };
  /** Setters for injecting the newly created entity into the parent form state */
  customersSetter?: React.Dispatch<React.SetStateAction<any[]>>;
  customerValueSetter?: (value: string) => void;
  suppliersSetter?: React.Dispatch<React.SetStateAction<any[]>>;
  supplierValueSetter?: (value: string) => void;
  itemsSetter?: React.Dispatch<React.SetStateAction<any[]>>;
  itemValueSetter?: (value: string) => void;
};

const ENTITY_TITLES: Record<QuickAddEntity, string> = {
  customer: 'Quick Add Customer',
  supplier: 'Quick Add Supplier',
  item: 'Quick Add Item',
};

export default function QuickAddProvider({
  quickAdd,
  customersSetter,
  customerValueSetter,
  suppliersSetter,
  supplierValueSetter,
  itemsSetter,
  itemValueSetter,
}: Props) {
  const { state, close, onCreated } = quickAdd;

  if (!state.isOpen || !state.entityType) return null;

  const title = ENTITY_TITLES[state.entityType] || 'Quick Add';

  const renderForm = () => {
    switch (state.entityType) {
      case 'customer':
        return (
          <QuickAddCustomerForm
            prefill={state.prefill}
            onCancel={close}
            onCreated={(option, raw) => {
              if (customersSetter && customerValueSetter) {
                onCreated(option, customersSetter, customerValueSetter, raw);
              } else {
                close();
              }
            }}
          />
        );
      case 'supplier':
        return (
          <QuickAddSupplierForm
            prefill={state.prefill}
            onCancel={close}
            onCreated={(option, raw) => {
              if (suppliersSetter && supplierValueSetter) {
                onCreated(option, suppliersSetter, supplierValueSetter, raw);
              } else {
                close();
              }
            }}
          />
        );
      case 'item':
        return (
          <QuickAddItemForm
            prefill={state.prefill}
            onCancel={close}
            onCreated={(option, raw) => {
              if (itemsSetter && itemValueSetter) {
                onCreated(option, itemsSetter, itemValueSetter, raw);
              } else {
                close();
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <QuickAddModal open={state.isOpen} onClose={close} title={title}>
      {renderForm()}
    </QuickAddModal>
  );
}
