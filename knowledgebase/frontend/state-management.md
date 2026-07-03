# State Management

## Purpose

Define state management patterns for modern React/Next.js applications.

**Last Verified**: June 2026

---

## State Categories

| Category | Where | Solution |
|---|---|---|
| Server Data | Server Components | Direct DB/API fetch |
| URL State | URL params/searchParams | useRouter, useSearchParams |
| Form State | Server Actions | useActionState, useFormStatus |
| UI State | Client Components | useState |
| Global UI State | Context | React Context |
| Complex Client State | External store | Zustand (if needed) |

---

## Server State (Preferred)

### Server Components

```tsx
// app/users/page.tsx - No client state needed
export default async function UsersPage() {
  const users = await db.user.findMany();
  const total = await db.user.count();
  
  return (
    <div>
      <h1>Users ({total})</h1>
      <UserList users={users} />
    </div>
  );
}
```

### Server Actions for Mutations

```tsx
'use server';

export async function createUser(formData: FormData) {
  const data = schema.parse(Object.fromEntries(formData));
  const user = await db.user.create({ data });
  revalidateTag('users');
  return { success: true, user };
}
```

---

## URL State

### Search Params

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export function UserFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get('status') || 'all'}
      onChange={e => updateFilter('status', e.target.value)}
    >
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}
```

---

## Local State

### useState

```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### useReducer

```tsx
'use client';

import { useReducer } from 'react';

interface State {
  items: Item[];
  loading: boolean;
  error: string | null;
}

type Action = 
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: Item[] }
  | { type: 'ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'SUCCESS':
      return { items: action.payload, loading: false, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.payload };
  }
}

export function ItemList() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: false,
    error: null,
  });
}
```

---

## Context (Simple Global State)

### Theme Context

```tsx
'use client';

import { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  
  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

### Auth Context

```tsx
'use client';

import { createContext, useContext } from 'react';

interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContext>({ user: null, isAuthenticated: false });

export function AuthProvider({ children, user }: { children: React.ReactNode; user: User | null }) {
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

## External Store (When Needed)

### Zustand

```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        addItem: (item) => set(state => ({
          items: [...state.items, item],
        })),
        removeItem: (id) => set(state => ({
          items: state.items.filter(item => item.id !== id),
        })),
        clearCart: () => set({ items: [] }),
        total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      }),
      { name: 'cart' }
    )
  )
);
```

---

## Decision Guide

### When to Use Each Approach

| Scenario | Solution | Why |
|---|---|---|
| Fetching data | Server Component | No client state needed |
| Form submission | Server Action | Built-in Next.js |
| URL filters/pagination | useSearchParams | Shareable, bookmarkable |
| Toggle/modal/dropdown | useState | Simple, local |
| Theme/auth | Context | Global, simple |
| Shopping cart | Zustand | Complex, persisted |
| Undo/redo | useReducer | Complex state transitions |
| Real-time collaboration | External store + WebSocket | Complex sync |

### Minimize Client State

1. **Prefer Server Components** - No client state needed
2. **Use URL for filters** - Shareable, bookmarkable
3. **Derive state** - Compute from existing state
4. **Lift state up** - Share via props, not context
5. **Context sparingly** - Only for truly global state

---

## Anti-Patterns

- **Over-using Context**: Re-renders all consumers on any change
- **Storing server data in state**: Fetch in Server Components
- **Global state for local concerns**: Use useState
- **Missing state normalization**: Normalize complex relational data
- **Storing derived state**: Compute it instead
- **State duplication**: Single source of truth

---

## Verification Checklist

- [ ] Server Components for data fetching
- [ ] Server Actions for mutations
- [ ] URL state for filters/pagination
- [ ] Local state for UI concerns
- [ ] Context for global UI state
- [ ] External store only when necessary
- [ ] State minimized
- [ ] Derived state computed, not stored
