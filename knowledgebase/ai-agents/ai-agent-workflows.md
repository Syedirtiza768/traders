# AI Agent Workflows

## Purpose

Define how AI coding agents should interact with codebases safely, effectively, and predictably.

**Last Verified**: June 2026

---

## Core Principles

### 1. Read Before Write

Always understand the codebase before making changes. Never modify code you haven't read.

### 2. Verify Before Claiming

Always verify changes work before claiming completion. Run tests, type checks, and linting.

### 3. Preserve Contracts

Never break existing API contracts, database schemas, or public interfaces without explicit instruction.

### 4. Document Assumptions

State assumptions explicitly. When uncertain, ask rather than guess.

### 5. Minimal Changes

Make the smallest change that solves the problem. Don't refactor unrelated code.

---

## Workflow: Understanding a Codebase

### Step 1: High-Level Structure

```
1. Read README.md and documentation
2. List top-level directory structure
3. Identify package.json / dependencies
4. Identify framework (Next.js, NestJS, etc.)
5. Identify entry points
```

### Step 2: Architecture Discovery

```
1. Identify module/package boundaries
2. Map database schema (Prisma schema, migrations)
3. Map API routes and controllers
4. Map frontend routes and pages
5. Identify shared utilities and libraries
```

### Step 3: Pattern Recognition

```
1. Identify coding conventions (naming, structure)
2. Identify error handling patterns
3. Identify authentication/authorization patterns
4. Identify testing patterns
5. Identify configuration patterns
```

### Step 4: Build Context Map

```
Create mental model:
- What frameworks and libraries are used
- How the app is structured
- Where business logic lives
- How data flows
- What conventions are followed
```

---

## Workflow: Making Changes

### Step 1: Understand Requirements

```
1. Read the request carefully
2. Identify affected files and modules
3. Identify potential side effects
4. Plan the change approach
```

### Step 2: Read Affected Code

```
1. Read all files that will be modified
2. Read files that import modified files
3. Read related test files
4. Understand existing patterns
```

### Step 3: Implement Changes

```
1. Make minimal, focused changes
2. Follow existing code patterns
3. Maintain consistent style
4. Add/update types as needed
```

### Step 4: Verify Changes

```
1. Run type checking (tsc --noEmit)
2. Run linting (eslint/biome)
3. Run affected tests
4. Run build if applicable
5. Check for console errors
```

### Step 5: Report Results

```
1. Summarize what was changed
2. List files modified
3. Note any assumptions made
4. Note any concerns or risks
5. Suggest follow-up actions
```

---

## Workflow: Bug Investigation

### Step 1: Reproduce

```
1. Understand the reported behavior
2. Identify expected vs actual behavior
3. Find the relevant code path
4. Trace the execution flow
```

### Step 2: Diagnose

```
1. Read error messages carefully
2. Check recent changes (git log)
3. Trace data flow
4. Identify root cause
```

### Step 3: Fix

```
1. Fix the root cause, not symptoms
2. Add regression test
3. Verify fix works
4. Check for similar issues
```

---

## Workflow: Feature Implementation

### Step 1: Plan

```
1. Understand requirements
2. Identify affected modules
3. Design the approach
4. Identify risks and dependencies
```

### Step 2: Database Changes

```
1. Design schema changes
2. Create migration
3. Update ORM models
4. Seed test data if needed
```

### Step 3: Backend Implementation

```
1. Create/update DTOs
2. Create/update services
3. Create/update controllers
4. Add validation
5. Add authorization
6. Write tests
```

### Step 4: Frontend Implementation

```
1. Create/update API client
2. Create/update components
3. Create/update pages
4. Add loading/error states
5. Write tests
```

### Step 5: Integration

```
1. Test end-to-end flow
2. Verify error handling
3. Verify edge cases
4. Update documentation
```

---

## Workflow: Refactoring

### Step 1: Understand Current State

```
1. Read the code to be refactored
2. Understand all callers/consumers
3. Identify test coverage
4. Plan the refactoring approach
```

### Step 2: Ensure Test Coverage

```
1. Write tests for current behavior (if missing)
2. Run tests to confirm they pass
3. These tests become your safety net
```

### Step 3: Refactor Incrementally

```
1. Make small, atomic changes
2. Run tests after each change
3. Commit frequently
4. Never refactor and change behavior simultaneously
```

### Step 4: Verify

```
1. All existing tests still pass
2. No new type errors
3. No new lint warnings
4. Behavior is unchanged
```

---

## Safety Rules

### Never Do

- Delete files without reading them first
- Modify database migrations that have been applied
- Change API contracts without updating all consumers
- Commit secrets, tokens, or credentials
- Disable security features (auth, validation, rate limiting)
- Skip tests or disable test assertions
- Make changes you can't explain

### Always Do

- Read files before modifying them
- Run type checking after changes
- Run tests after changes
- Follow existing code patterns
- Preserve backward compatibility
- Document assumptions
- Ask when uncertain

---

## Error Recovery

### When Changes Break Something

```
1. Stop making changes
2. Identify what broke
3. Revert if necessary (git checkout/git revert)
4. Understand why it broke
5. Try a different approach
```

### When Stuck

```
1. Re-read the requirements
2. Re-read the affected code
3. Try a simpler approach
4. Ask for clarification
5. Document what you tried
```

---

## Anti-Patterns

- **Hallucinating files**: Never claim a file exists without reading it
- **Hallucinating APIs**: Never use a function/API without verifying it exists
- **Skipping verification**: Always run checks after changes
- **Over-engineering**: Make the minimum change needed
- **Ignoring tests**: Tests are guardrails, not optional
- **Breaking contracts**: Never change public interfaces without updating consumers
- **Silent failures**: Always report errors and concerns

---

## Verification Checklist

- [ ] Read all files before modifying
- [ ] Understand existing patterns
- [ ] Follow codebase conventions
- [ ] Run type checking after changes
- [ ] Run tests after changes
- [ ] Document assumptions
- [ ] Report results clearly
