# Refactoring Strategy

## Purpose

Plan and execute code refactoring to improve internal design while preserving external behavior, enabling sustainable software evolution.

## Inputs

- Codebase to refactor
- Code smell identification
- Test coverage assessment
- Business constraints
- Team capacity
- Risk tolerance

## Expected Outputs

- Refactoring plan
- Prioritized refactoring targets
- Test coverage requirements
- Incremental refactoring steps
- Risk mitigation strategies
- Success criteria

## Decision Process

### 1. Code Smell Detection

**Bloaters** (Code that has grown too large)

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Long Method | Method too long | Extract Method |
| Large Class | Class too large | Extract Class, Extract Subclass |
| Primitive Obsession | Using primitives for domain concepts | Replace with Object |
| Long Parameter List | Too many parameters | Introduce Parameter Object |
| Data Clumps | Data often together | Extract Class |

**Object-Orientation Abusers**

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Switch Statements | Complex switch/if chains | Replace with polymorphism |
| Temporary Field | Fields only set sometimes | Extract Class |
| Refused Bequest | Subclass doesn't use inheritance | Replace inheritance with delegation |
| Alternative Classes | Different interfaces, same behavior | Unify interfaces |

**Change Preventers**

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Divergent Change | One class changed for multiple reasons | Extract Class |
| Shotgun Surgery | One change requires many small changes | Move Method, Inline Class |
| Parallel Inheritance Hierarchies | Creating subclass creates another | Move hierarchy to one place |

**Dispensables**

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Comments | Explaining complex code | Extract Method, Rename |
| Duplicate Code | Same code in multiple places | Extract Method, Pull Up |
| Lazy Class | Class doing too little | Inline Class |
| Data Class | Classes with only data | Move methods to class |
| Dead Code | Unused code | Delete |
| Speculative Generality | Unused abstractions | Collapse Hierarchy |

**Couplers**

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| Feature Envy | Method uses another class more | Move Method |
| Inappropriate Intimacy | Classes too familiar with each other | Move Method, Extract Class |
| Message Chains | Long chain of calls | Hide Delegate |
| Middle Man | Class delegating too much | Remove Middle Man |

### 2. Refactoring Prioritization

**Priority Matrix**

| Impact | Effort | Priority |
|--------|--------|----------|
| High | Low | Do first |
| High | High | Plan carefully |
| Low | Low | Do opportunistically |
| Low | High | Avoid |

**Impact Assessment**
- How much does this impede development?
- How often does this cause bugs?
- How much does this slow understanding?
- How much does this block changes?

**Effort Estimation**
- Size of affected code
- Test coverage
- Dependencies
- Risk level

### 3. Test Coverage Assessment

**Minimum Coverage for Refactoring**
- Critical paths: 100%
- Happy paths: 80%+
- Edge cases: 60%+

**Test Types Needed**
- Unit tests: Fast feedback, isolation
- Integration tests: Component interaction
- Characterization tests: Capture current behavior

**Adding Tests Before Refactoring**
1. Identify behavior to preserve
2. Write characterization tests
3. Verify tests pass
4. Refactor
5. Verify tests still pass

### 4. Refactoring Techniques

**Extract Method**
```
Before:
void printOwing() {
    // print banner
    System.out.println("***********************");
    System.out.println("*** Customer Owes ***");
    System.out.println("***********************");
    
    // calculate details
    double outstanding = 0;
    for (Order order : orders) {
        outstanding += order.getAmount();
    }
    
    // print details
    System.out.println("name: " + name);
    System.out.println("amount: " + outstanding);
}

After:
void printOwing() {
    printBanner();
    double outstanding = calculateOutstanding();
    printDetails(outstanding);
}
```

**Extract Class**
```
Before:
class Person {
    String name;
    String officeAreaCode;
    String officeNumber;
    // methods...
}

After:
class Person {
    String name;
    TelephoneNumber officeTelephone;
    // methods...
}

class TelephoneNumber {
    String areaCode;
    String number;
    // methods...
}
```

**Replace Conditional with Polymorphism**
```
Before:
double getSpeed() {
    switch (type) {
        case EUROPEAN: return getBaseSpeed();
        case AFRICAN: return getBaseSpeed() - getLoadFactor();
        case NORWEGIAN: return getBaseSpeed() + getVoltage();
    }
}

After:
abstract class Bird {
    abstract double getSpeed();
}

class EuropeanBird extends Bird {
    double getSpeed() { return getBaseSpeed(); }
}

class AfricanBird extends Bird {
    double getSpeed() { return getBaseSpeed() - getLoadFactor(); }
}
```

**Move Method**
- Move method to class that uses it most
- Reduce coupling
- Improve cohesion

**Inline Method**
- When method body is as clear as name
- When indirection is unnecessary

### 5. Incremental Refactoring

**Principles**
- Small steps
- Test after each step
- Commit frequently
- One refactoring at a time

**Process**
1. Identify refactoring needed
2. Ensure tests exist
3. Make smallest possible change
4. Run tests
5. Commit if green
6. Repeat until complete

**Example: Extract Class Incrementally**
1. Create new class
2. Copy one field to new class
3. Update references
4. Test
5. Commit
6. Repeat for each field
7. Move methods one at a time
8. Test
9. Commit
10. Remove old class

### 6. Legacy Code Strategies

**Characterization Tests**
- Tests that capture current behavior
- Don't assume correctness
- Write before changing
- Use to verify preservation

**Seam Identification**
- Places where behavior can be changed without modifying code
- Dependency injection points
- Configuration points
- Inheritance points

**Sprout Method**
- Add new functionality in new method
- Don't modify existing code
- Call new method from existing code

**Sprout Class**
- Add new functionality in new class
- Keep existing class unchanged
- Gradually migrate functionality

**Strangler Fig**
- Create new implementation alongside old
- Route new requests to new implementation
- Gradually migrate all traffic
- Remove old implementation

### 7. Risk Mitigation

**Testing Strategy**
- Run full test suite
- Manual testing for critical paths
- Performance testing if relevant
- Integration testing

**Deployment Strategy**
- Feature flags for large refactorings
- Gradual rollout
- Monitoring for issues
- Rollback plan

**Communication**
- Inform stakeholders
- Coordinate with team
- Document changes
- Update documentation

## Evaluation Criteria

### Refactoring Readiness

| Aspect | Ready | Not Ready |
|--------|-------|-----------|
| Tests | Comprehensive coverage | Minimal coverage |
| Understanding | Clear what code does | Unclear behavior |
| Scope | Well-defined | Vague |
| Time | Allocated | Squeezed in |
| Risk | Acceptable | Too high |

### Refactoring Quality

| Aspect | Good | Poor |
|--------|------|------|
| Behavior | Preserved | Changed |
| Design | Improved | Same or worse |
| Tests | Still pass | Broken |
| Complexity | Reduced | Increased |
| Understanding | Clearer | More confusing |

## Trade-offs

### Scope of Refactoring

| Scope | Risk | Benefit |
|-------|------|---------|
| Small | Low | Incremental improvement |
| Medium | Medium | Significant improvement |
| Large | High | Major improvement |

**Guidance**: Prefer small, incremental refactorings

### Test Investment

| Investment | Short-term | Long-term |
|------------|------------|-----------|
| Minimal | Fast | Risky refactoring |
| Adequate | Moderate | Safe refactoring |
| Comprehensive | Slow | Very safe refactoring |

**Guidance**: Invest in tests for code that changes frequently

### Refactoring vs Rewrite

| Approach | When to Use |
|----------|-------------|
| Refactor | Tests exist, behavior understood, incremental improvement |
| Rewrite | No tests, behavior unclear, fundamental problems |

**Guidance**: Refactor first, rewrite only when necessary

## Validation Checklist

- [ ] Code smells are identified
- [ ] Refactoring is prioritized by impact/effort
- [ ] Test coverage is adequate
- [ ] Tests are written before refactoring
- [ ] Refactoring is done incrementally
- [ ] Each step is tested
- [ ] Changes are committed frequently
- [ ] Behavior is preserved
- [ ] Design is improved
- [ ] Team is informed
- [ ] Documentation is updated

## Common Pitfalls

1. **Refactoring without tests**: Risky, likely to break behavior
2. **Big bang refactoring**: Too risky, hard to debug
3. **Gold-plating**: Refactoring beyond what's needed
4. **Not committing frequently**: Large rollbacks if needed
5. **Changing behavior**: Not preserving external behavior
6. **Refactoring during feature work**: Mixing concerns
7. **Not understanding code**: Refactoring blindly
8. **Ignoring team**: Not communicating changes

## References

- Refactoring (Fowler)
- Working Effectively with Legacy Code (Feathers)
- Clean Code (Martin)

## Related Capabilities

- Technical Debt Assessment
- Architecture Review
- Testing Strategy
- Legacy Modernization
