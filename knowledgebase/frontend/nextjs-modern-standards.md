# Next.js Modern Standards

## Purpose

Define modern Next.js v16 patterns for building production-grade frontend applications.

**Last Verified**: June 2026
**Next.js Version**: v16.2.x
**React Version**: v19.2.x

---

## App Router Architecture

### Project Structure

```
app/
  layout.tsx                 # Root layout
  page.tsx                   # Home page
  not-found.tsx              # 404 page
  error.tsx                  # Error boundary
  loading.tsx                # Loading state
  
  (auth)/                    # Route group (no URL segment)
    login/page.tsx
    register/page.tsx
  
  (dashboard)/               # Authenticated routes
    layout.tsx               # Dashboard layout
    page.tsx                 # Dashboard home
    users/
      page.tsx
      [id]/page.tsx
    orders/
      page.tsx
      [id]/page.tsx
  
  api/                       # Route Handlers
    users/route.ts
    orders/route.ts
  
  @modal/                    # Parallel route for modals
    default.tsx              # Required in v16
    login/page.tsx
  
  components/                # Shared components
    ui/                      # Design system components
    forms/                   # Form components
    layouts/                 # Layout components
  
  lib/                       # Shared utilities
    api.ts                   # API client
    auth.ts                  # Auth utilities
    utils.ts                 # General utilities
  
  hooks/                     # Custom hooks
  types/                     # TypeScript types
```

---

## Server Components vs Client Components

### Server Components (Default)

**Use for**: Data fetching, accessing backend resources, sensitive data, heavy computations, SEO content.

```tsx
// app/users/page.tsx (Server Component by default)
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany();
  
  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
    </div>
  );
}
```

### Client Components

**Use for**: Interactivity, browser APIs, event handlers, state management, animations.

```tsx
// components/user-list.tsx
'use client';

import { useState } from 'react';

export function UserList({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input 
        value={search} 
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      {filtered.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Rules

- Server Components can import Client Components
- Client Components cannot import Server Components
- Use `'use client'` directive at the top of file
- Keep `'use client'` boundary as low as possible
- Pass Server Component children as props to Client Components

---

## Server Actions

### Definition

```tsx
// app/actions/users.ts
'use server';

import { revalidateTag, updateTag } from 'next/cache';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const validated = createUserSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  const user = await db.user.create({ data: validated });
  
  // Revalidate with cacheLife profile (required in v16)
  revalidateTag('users', 'max');
  
  return { success: true, userId: user.id };
}

export async function updateUser(userId: string, data: UpdateUserData) {
  await db.user.update({ where: { id: userId }, data });
  
  // updateTag for read-your-writes (new in v16)
  updateTag(`user-${userId}`);
}
```

### Usage in Forms

```tsx
// app/users/new/page.tsx
import { createUser } from '@/app/actions/users';

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### Usage with useActionState

```tsx
'use client';

import { useActionState } from 'react';
import { createUser } from '@/app/actions/users';

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUser, null);

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

---

## Data Fetching

### Server Component Fetching

```tsx
// app/users/page.tsx
export default async function UsersPage() {
  // Direct database access (Server Component)
  const users = await db.user.findMany();
  
  // Or API call
  const response = await fetch('http://localhost:3000/api/users', {
    next: { tags: ['users'] },
  });
  const users = await response.json();

  return <UserList users={users} />;
}
```

### Caching (Next.js 16)

```tsx
// Using cacheLife for fine-grained control
import { cacheLife } from 'next/cache';

export default async function ProductsPage() {
  'use cache';
  cacheLife('hours');
  
  const products = await db.product.findMany();
  return <ProductList products={products} />;
}

// Using cacheTag for revalidation
import { cacheTag } from 'next/cache';

export default async function UserPage({ params }: { params: { id: string } }) {
  'use cache';
  cacheTag(`user-${params.id}`);
  
  const user = await db.user.findUnique({ where: { id: params.id } });
  return <UserProfile user={user} />;
}
```

### Async Request APIs (Required in v16)

```tsx
// params and searchParams are async in v16
export default async function Page(props: PageProps<'/users/[id]'>) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  
  const user = await db.user.findUnique({ where: { id } });
  return <UserProfile user={user} />;
}
```

---

## Routing

### Route Groups

```tsx
// app/(marketing)/layout.tsx - Marketing layout
// app/(dashboard)/layout.tsx - Dashboard layout
// Both share the same URL structure but different layouts
```

### Parallel Routes

```tsx
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

// app/@modal/default.tsx (required in v16)
export default function Default() {
  return null;
}
```

### Intercepting Routes

```tsx
// app/(.)photo/[id]/page.tsx - Intercept when navigating to /photo/id
// app/photo/[id]/page.tsx - Full page when directly navigating
```

---

## Proxy (Middleware in v16)

### proxy.ts (Renamed from middleware.ts)

```tsx
// proxy.ts (root of project)
import { NextResponse } from 'next/server';

export function proxy(request: Request) {
  const token = request.headers.get('authorization');
  
  // Auth check
  if (request.url.includes('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Tenant resolution
  const hostname = request.headers.get('host');
  const tenant = hostname?.split('.')[0];
  
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant || '');
  
  return response;
}
```

---

## Error Handling

### Error Boundary

```tsx
// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Not Found

```tsx
// app/users/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  
  if (!user) {
    notFound();
  }

  return <UserProfile user={user} />;
}
```

---

## SEO and Metadata

### Static Metadata

```tsx
export const metadata: Metadata = {
  title: 'Users | MyApp',
  description: 'Manage users',
};
```

### Dynamic Metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const user = await db.user.findUnique({ where: { id: params.id } });
  
  return {
    title: `${user.name} | MyApp`,
    description: `Profile of ${user.name}`,
  };
}
```

---

## Performance

### Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={true} // For above-the-fold images
/>
```

### Font Optimization

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart />
      </Suspense>
    </div>
  );
}
```

---

## Turbopack (Default in v16)

### Configuration

```tsx
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Turbopack-specific options
  },
  reactCompiler: true, // Enable React Compiler (opt-in)
};

export default nextConfig;
```

---

## Anti-Patterns

- **'use client' everywhere**: Keep Server Components as default
- **Fetching in useEffect**: Fetch in Server Components or Server Actions
- **Missing loading states**: Always provide loading.tsx or Suspense
- **Missing error boundaries**: Always provide error.tsx
- **Synchronous params access**: Use await for params in v16
- **Using middleware.ts**: Rename to proxy.ts in v16
- **Missing metadata**: Always define metadata for SEO
- **Over-optimizing**: Use React Compiler instead of manual memoization

---

## Verification Checklist

- [ ] App Router structure defined
- [ ] Server Components for data fetching
- [ ] Client Components for interactivity
- [ ] Server Actions for mutations
- [ ] Async params/searchParams in v16
- [ ] proxy.ts instead of middleware.ts
- [ ] Error boundaries configured
- [ ] Loading states configured
- [ ] Metadata configured for SEO
- [ ] Turbopack configured
