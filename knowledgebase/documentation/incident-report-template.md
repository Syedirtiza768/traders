# Incident Report Template

## Purpose

Template for documenting incidents - what happened, impact, root cause, and prevention.

**Last Verified**: June 2026

---

## Template

```markdown
# Incident Report: {Incident Title}

**Date**: {YYYY-MM-DD}
**Duration**: {Start time - End time (UTC)}
**Severity**: {P1-Critical / P2-High / P3-Medium / P4-Low}
**Status**: {Investigating / Identified / Monitoring / Resolved}
**Incident Commander**: {Name}

---

## Summary

{One paragraph summary of what happened, impact, and resolution}

## Impact

### Users Affected
- **Number**: {count or percentage}
- **Region**: {geographic impact}
- **Duration**: {how long users were affected}

### Business Impact
- **Revenue**: {estimated revenue impact}
- **SLA**: {SLA breach? Y/N}
- **Reputation**: {customer complaints, social media}

### Services Affected
| Service | Impact | Duration |
|---|---|---|
| {service} | {description} | {duration} |

## Timeline

| Time (UTC) | Event |
|---|---|
| {HH:MM} | {Event description} |
| {HH:MM} | {Event description} |
| {HH:MM} | {Event description} |
| {HH:MM} | Resolution confirmed |

## Root Cause

### What Happened
{Detailed technical explanation of what caused the incident}

### Why It Happened
{Root cause analysis - why did the above happen?}

### Contributing Factors
- {Factor 1}
- {Factor 2}

## Detection

### How Was It Detected
{Monitoring alert / Customer report / Internal discovery}

### Time to Detect
{How long from incident start to detection}

### Detection Gaps
{What allowed this to happen without earlier detection?}

## Resolution

### What Was Done
{Steps taken to resolve the incident}

### What Fixed It
{The actual fix that resolved the issue}

### Temporary vs Permanent
{Was this a temporary fix or permanent solution?}

## Prevention

### Immediate Actions
- [ ] {Action 1}
- [ ] {Action 2}

### Long-term Actions
- [ ] {Action 1}
- [ ] {Action 2}

### Monitoring Improvements
- [ ] {Improvement 1}
- [ ] {Improvement 2}

## Lessons Learned

### What Went Well
- {Positive 1}
- {Positive 2}

### What Could Be Improved
- {Improvement 1}
- {Improvement 2}

### What We Learned
- {Learning 1}
- {Learning 2}

## Action Items

| Action | Owner | Due Date | Status |
|---|---|---|---|
| {Action} | {Name} | {Date} | {Status} |

## References

- {Link to monitoring data}
- {Link to Slack/Teams conversation}
- {Link to related incidents}
```

---

## Severity Definitions

| Severity | Definition | Response Time | Update Frequency |
|---|---|---|---|
| P1-Critical | Service down, all users affected | 15 minutes | Every 30 minutes |
| P2-High | Major feature broken, many users affected | 1 hour | Every 2 hours |
| P3-Medium | Minor feature broken, some users affected | 4 hours | Daily |
| P4-Low | Cosmetic issue, few users affected | 24 hours | Weekly |

---

## Anti-Patterns

- **Blame culture**: Focus on systems, not individuals
- **Incomplete timeline**: Document all events chronologically
- **No follow-up**: Track action items to completion
- **No prevention**: Always identify prevention measures
- **Skipping post-mortem**: Always conduct a review
