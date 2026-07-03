# React Modern Standards

## Purpose

Define modern React v19 patterns for building production-grade frontend applications.

**Last Verified**: June 2026
**React Version**: v19.2.x

---

## React 19 Features

### View Transitions

```tsx
import { unstable_ViewTransition as ViewTransition } from 'react';

function Component() {
  return (
    <ViewTransition name="hero">
      <img src="/hero.jpg" alt="Hero" />
    </ViewTransition>
  );
}
```

### useEffectEvent

```tsx
import { useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    logConnection(roomId, theme);
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      onConnected();
    });
    return () => connection.disconnect();
  }, [roomId]); // theme not needed in deps
}
```

### Activity (Background Rendering)

```tsx
import { unstable_Activity as Activity } from 'react';

function App() {
  const [tab, setTab] = useState('home');
  
  return (
    <>
      <TabBar onChange={setTab} />
      <Activity mode={tab === 'home' ? 'visible' : 'hidden'}>
        <HomePage />
      </Activity>
      <Activity mode={tab === 'settings' ? 'visible' : 'hidden'}>
        <SettingsPage />
      </Activity>
    </>
  );
}
```

### React Compiler

```tsx
// next.config.ts
const nextConfig = {
  reactCompiler: true, // Auto-memoization, no manual useMemo/useCallback
};

// Components don't need manual optimization
function UserList({ users }) {
  // React Compiler automatically memoizes this
  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
  
  return sorted.map(user => <UserCard key={user.id} user={user} />);
}
```

---

## Component Patterns

### Server Component

```tsx
// Default - no directive needed
export default async function UserPage() {
  const users = await fetchUsers();
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### Client Component

```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### Composition Pattern

```tsx
// Server Component wrapping Client Component
import { UserList } from './user-list';

export async function UsersPage() {
  const users = await fetchUsers();
  
  return (
    <div>
      <h1>Users</h1>
      <UserList initialUsers={users} /> {/* Client Component */}
    </div>
  );
}
```

---

## Hooks

### use (Data Fetching)

```tsx
'use client';

import { use } from 'react';

function UserPosts({ userPromise }) {
  const user = use(userPromise);
  
  return (
    <div>
      <h2>{user.name}</h2>
      {user.posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### useOptimistic

```tsx
'use client';

import { useOptimistic } from 'react';

function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleAdd(text) {
    addOptimisticTodo({ text });
    await addTodo(text);
  }

  return (
    <div>
      {optimisticTodos.map(todo => (
        <div key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}
```

### useActionState

```tsx
'use client';

import { useActionState } from 'react';

function SignupForm({ signup }) {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button disabled={isPending}>
        {isPending ? 'Signing up...' : 'Sign Up'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

### useFormStatus

```tsx
'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

---

## State Management

### Local State

```tsx
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);
```

### Derived State

```tsx
const fullName = `${user.firstName} ${user.lastName}`;
const filtered = items.filter(item => item.active);
```

### Context (Simple Global State)

```tsx
const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Server State

```tsx
// Use Server Components for initial data
// Use Server Actions for mutations
// Minimize client-side state management
```

---

## Forms

### Server Action Form

```tsx
export default function CreateUserPage() {
  return (
    <form action={createUser}>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <button type="submit">Create</button>
    </form>
  );
}
```

### Client Form with Validation

```tsx
'use client';

import { useActionState } from 'react';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export function CreateUserForm() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(formData: FormData) {
    const result = schema.safeParse(Object.fromEntries(formData));
    
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    await createUser(result.data);
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      {errors.name && <span>{errors.name[0]}</span>}
      <input name="email" type="email" />
      {errors.email && <span>{errors.email[0]}</span>}
      <button type="submit">Create</button>
    </form>
  );
}
```

---

## Error Handling

### Error Boundary

```tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

---

## Performance

### React Compiler (Automatic)

```tsx
// No manual memoization needed with React Compiler
function ProductList({ products, onSelect }) {
  // Automatically memoized by React Compiler
  const sorted = [...products].sort((a, b) => a.price - b.price);
  
  return sorted.map(product => (
    <ProductCard
      key={product.id}
      product={product}
      onSelect={onSelect}
    />
  ));
}
```

### Code Splitting

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

---

## Anti-Patterns

- **Using useEffect for data fetching**: Use Server Components
- **Manual memoization with React Compiler**: Let compiler handle it
- **Prop drilling**: Use context or composition
- **Too much client state**: Derive from server data
- **Missing key prop**: Always provide stable keys
- **Mutating state directly**: Use setState with new references
- **Using index as key**: Use stable identifiers

---

## Verification Checklist

- [ ] Server Components for data fetching
- [ ] Client Components for interactivity
- [ ] Server Actions for mutations
- [ ] Error boundaries configured
- [ ] Loading states with Suspense
- [ ] React Compiler enabled (opt-in)
- [ ] Forms using Server Actions
- [ ] State management minimized
- [ ] Code splitting for heavy components
