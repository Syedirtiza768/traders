# Accessibility

## Purpose

Define accessibility standards for building inclusive web applications.

**Last Verified**: June 2026

---

## WCAG 2.2 Compliance

### Level A (Minimum)

- All images have alt text
- All form inputs have labels
- Page has proper heading hierarchy
- Content is keyboard accessible
- No keyboard traps
- Skip navigation link provided

### Level AA (Recommended)

- Color contrast ratio 4.5:1 for normal text
- Color contrast ratio 3:1 for large text
- Text resizable to 200% without loss
- Focus indicators visible
- Multiple ways to find pages
- Consistent navigation

### Level AAA (Aspirational)

- Color contrast ratio 7:1 for normal text
- Sign language interpretation
- Extended audio descriptions

---

## Semantic HTML

### Proper Element Usage

```tsx
// Bad
<div className="button" onClick={handleClick}>Submit</div>

// Good
<button type="submit" onClick={handleClick}>Submit</button>
```

### Landmarks

```tsx
export default function Layout({ children }) {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute">
        Skip to main content
      </a>
      <header>
        <nav aria-label="Main navigation">...</nav>
      </header>
      <main id="main-content">
        {children}
      </main>
      <footer>...</footer>
    </>
  );
}
```

### Heading Hierarchy

```tsx
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>
```

---

## Forms

### Labels

```tsx
// Bad
<input placeholder="Email" />

// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />
```

### Error Messages

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && (
  <p id="email-error" role="alert" className="text-red-500">
    {error}
  </p>
)}
```

### Fieldset for Groups

```tsx
<fieldset>
  <legend>Billing Address</legend>
  <label htmlFor="street">Street</label>
  <input id="street" />
  <label htmlFor="city">City</label>
  <input id="city" />
</fieldset>
```

---

## ARIA Attributes

### Common Patterns

```tsx
// Toggle button
<button aria-pressed={isActive} onClick={toggle}>
  Active
</button>

// Modal
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure?</p>
</div>

// Loading
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? 'Loading...' : content}
</div>

// Navigation
<nav aria-label="Pagination">
  <ul>
    <li><a href="#" aria-current="page">1</a></li>
    <li><a href="#">2</a></li>
  </ul>
</nav>
```

### Live Regions

```tsx
// Announce changes to screen readers
<div aria-live="polite" aria-atomic="true">
  {message}
</div>

// For urgent updates
<div role="alert">
  {errorMessage}
</div>
```

---

## Keyboard Navigation

### Focus Management

```tsx
'use client';

import { useRef } from 'react';

export function Modal({ isOpen, onClose, children }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <button ref={closeRef} onClick={onClose}>Close</button>
      {children}
    </div>
  );
}
```

### Roving Tabindex

```tsx
function Toolbar() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div role="toolbar" aria-label="Formatting">
      <button
        tabIndex={activeIndex === 0 ? 0 : -1}
        onFocus={() => setActiveIndex(0)}
      >
        Bold
      </button>
      <button
        tabIndex={activeIndex === 1 ? 0 : -1}
        onFocus={() => setActiveIndex(1)}
      >
        Italic
      </button>
    </div>
  );
}
```

---

## Images and Media

### Alt Text

```tsx
// Informative image
<Image src="/chart.png" alt="Sales increased 25% from Q1 to Q2 2026" />

// Decorative image
<Image src="/divider.png" alt="" role="presentation" />

// Complex image
<figure>
  <Image src="/diagram.png" alt="System architecture diagram" />
  <figcaption>Detailed description of the architecture...</figcaption>
</figure>
```

---

## Color and Contrast

### Tailwind Accessibility Utilities

```tsx
// Sufficient contrast
<p className="text-gray-900 dark:text-gray-100">High contrast text</p>

// Focus indicators
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>

// Screen reader only
<span className="sr-only">Additional context for screen readers</span>
```

---

## Testing

### Automated Testing

```tsx
// axe-core with Testing Library
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing Checklist

- [ ] Tab through all interactive elements
- [ ] Verify focus indicators visible
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Test with 200% zoom
- [ ] Test with keyboard only (no mouse)
- [ ] Verify color contrast
- [ ] Test with prefers-reduced-motion

---

## Anti-Patterns

- **Using div as button**: Use semantic elements
- **Missing form labels**: Always associate labels with inputs
- **Color-only indicators**: Use icons or text in addition
- **Missing focus styles**: Always show focus indicators
- **Auto-playing media**: Provide controls and pause
- **Missing skip links**: Add skip navigation
- **Positive tabindex**: Use 0 or -1 only

---

## Verification Checklist

- [ ] Semantic HTML used
- [ ] Heading hierarchy correct
- [ ] Form inputs labeled
- [ ] Error messages accessible
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets AA
- [ ] ARIA attributes correct
- [ ] Images have alt text
- [ ] Skip link provided
