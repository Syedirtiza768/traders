# Frontend Architecture

## Purpose

Define frontend architecture principles for building maintainable, scalable frontend applications.

**Last Verified**: June 2026

---

## Component Architecture

### Component Hierarchy

```
app/                         # Pages (Server Components)
  ├── features/              # Feature-specific components
  │   ├── users/
  │   │   ├── user-list.tsx
  │   │   ├── user-form.tsx
  │   │   └── user-card.tsx
  │   └── orders/
  │       ├── order-list.tsx
  │       └── order-form.tsx
  ├── components/            # Shared components
  │   ├── ui/               # Design system (shadcn/ui)
  │   │   ├── button.tsx
  │   │   ├── input.tsx
  │   │   └── dialog.tsx
  │   ├── layouts/          # Layout components
  │   │   ├── sidebar.tsx
  │   │   └── header.tsx
  │   └── common/           # Shared components
  │       ├── data-table.tsx
  │       └── search-input.tsx
  ├── hooks/                # Custom hooks
  ├── lib/                  # Utilities
  └── types/                # TypeScript types
```

### Component Types

| Type | Responsibility | Example |
|---|---|---|
| Page | Route handler, data fetching | `app/users/page.tsx` |
| Layout | Shared layout structure | `app/(dashboard)/layout.tsx` |
| Feature | Business logic component | `features/users/user-form.tsx` |
| UI | Design system primitive | `components/ui/button.tsx` |
| Common | Shared utility component | `components/data-table.tsx` |
| Hook | Reusable logic | `hooks/use-debounce.ts` |

---

## Data Flow

### Server → Client

```
Server Component (fetch data)
  ↓ props
Client Component (interactive UI)
  ↓ Server Action
Server Component (revalidate)
```

### Pattern: Initial Data + Client Updates

```tsx
// Server Component provides initial data
export async function UsersPage() {
  const users = await db.user.findMany();
  return <UserList initialUsers={users} />;
}

// Client Component handles interactivity
'use client';
export function UserList({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  
  async function handleCreate(formData: FormData) {
    const newUser = await createUser(formData);
    setUsers(prev => [...prev, newUser]);
  }

  return (
    <>
      <CreateUserForm onSubmit={handleCreate} />
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </>
  );
}
```

---

## Feature Organization

### Feature Module Structure

```
features/
  users/
    components/
      user-list.tsx
      user-form.tsx
      user-card.tsx
      user-avatar.tsx
    hooks/
      use-users.ts
      use-user-form.ts
    actions/
      create-user.ts
      update-user.ts
    types/
      user.types.ts
    utils/
      user.utils.ts
    __tests__/
      user-list.test.tsx
      user-form.test.tsx
```

### Feature Exports

```tsx
// features/users/index.ts
export { UserList } from './components/user-list';
export { UserForm } from './components/user-form';
export { useUsers } from './hooks/use-users';
export type { User, CreateUserInput } from './types/user.types';
```

---

## Design System Integration

### shadcn/ui Components

```bash
# Install components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add table
```

### Custom Component Extension

```tsx
// components/ui/card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
}

export function StatCard({ title, value, change, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn('text-xs', trend === 'up' ? 'text-green-500' : 'text-red-500')}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Styling

### Tailwind CSS v4

```css
/* globals.css */
@import 'tailwindcss';

@theme {
  --color-primary: oklch(0.5 0.2 250);
  --color-secondary: oklch(0.6 0.15 180);
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### Component Styling

```tsx
import { cn } from '@/lib/utils';

export function Button({ className, variant, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        variant === 'primary' && 'bg-primary text-white',
        variant === 'outline' && 'border border-gray-300',
        className
      )}
      {...props}
    />
  );
}
```

---

## Forms

### Form Architecture

```
components/
  forms/
    form-field.tsx       # Generic form field wrapper
    form-submit.tsx      # Submit button with loading state
    form-error.tsx       # Error display component
```

### Reusable Form Components

```tsx
// components/forms/form-field.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

---

## API Integration

### API Client

```tsx
// lib/api.ts
class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  private async getHeaders(): Promise<Headers> {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL!);
```

---

## Loading States

### Skeleton Pattern

```tsx
// components/skeletons/user-list-skeleton.tsx
export function UserListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[160px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Suspense Integration

```tsx
import { Suspense } from 'react';
import { UserListSkeleton } from './skeletons/user-list-skeleton';

export default function UsersPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UserList />
    </Suspense>
  );
}
```

---

## Anti-Patterns

- **Prop drilling deep components**: Use context or composition
- **Fetching in useEffect**: Use Server Components
- **Too many client components**: Keep server as default
- **Missing loading states**: Always provide feedback
- **Inconsistent styling**: Use design system components
- **Missing TypeScript**: Use strict TypeScript
- **Large component files**: Split into smaller components
- **Business logic in components**: Extract to hooks or services

---

## Verification Checklist

- [ ] Component hierarchy defined
- [ ] Feature modules organized
- [ ] Design system components used
- [ ] Data flow patterns established
- [ ] Forms use Server Actions
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] API client configured
- [ ] TypeScript strict mode enabled
