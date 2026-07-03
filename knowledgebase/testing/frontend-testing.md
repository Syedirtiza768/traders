# Frontend Testing

## Purpose

Define frontend testing patterns for React and Next.js applications.

**Last Verified**: June 2026

---

## Component Testing

### Testing Library

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './user-card';

describe('UserCard', () => {
  const user = { id: '1', name: 'John Doe', email: 'john@example.com' };

  it('should render user info', () => {
    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should call onDelete when delete clicked', () => {
    const onDelete = vi.fn();
    render(<UserCard user={user} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
```

### Form Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserForm } from './create-user-form';

describe('CreateUserForm', () => {
  it('should submit form data', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<CreateUserForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  it('should show validation errors', async () => {
    render(<CreateUserForm />);

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
```

---

## Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('should increment', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => result.current.increment());

    expect(result.current.count).toBe(1);
  });
});
```

---

## Snapshot Testing

```typescript
it('should match snapshot', () => {
  const { container } = render(<UserCard user={user} />);
  expect(container).toMatchSnapshot();
});
```

---

## Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<UserCard user={user} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Next.js Testing

### Server Component Testing

```typescript
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
```

### Mocking API Calls

```typescript
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));
```

---

## Anti-Patterns

- **Testing implementation details**: Test behavior
- **Snapshot testing everything**: Use sparingly
- **No accessibility tests**: Include axe tests
- **Slow tests**: Mock external dependencies

---

## Verification Checklist

- [ ] Testing Library configured
- [ ] Component tests written
- [ ] Form tests written
- [ ] Hook tests written
- [ ] Accessibility tests included
- [ ] Coverage thresholds set
