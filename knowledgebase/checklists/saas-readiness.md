# SaaS Readiness Checklist

## Purpose

Checklist for verifying a SaaS application is ready for production customers.

**Last Verified**: June 2026

---

## Tenant Management

- [ ] Tenant registration flow
- [ ] Tenant onboarding flow
- [ ] Tenant configuration (branding, settings)
- [ ] Tenant user invitation
- [ ] Tenant deprovisioning
- [ ] Tenant data export
- [ ] Tenant data deletion (GDPR)

## User Management

- [ ] User registration
- [ ] User login/logout
- [ ] Password reset
- [ ] Email verification
- [ ] User profile management
- [ ] User role management
- [ ] User invitation system
- [ ] User activity tracking

## Subscription & Billing

- [ ] Free trial implementation
- [ ] Subscription plan management
- [ ] Plan upgrade/downgrade
- [ ] Usage metering
- [ ] Invoice generation
- [ ] Payment processing (Stripe)
- [ ] Failed payment handling
- [ ] Grace period for expired subscriptions
- [ ] Cancellation flow

## Feature Management

- [ ] Feature flags per plan
- [ ] Feature flags per tenant
- [ ] Usage limits per plan
- [ ] Limit enforcement
- [ ] Upgrade prompts when limits reached
- [ ] Beta feature rollout

## Multi-Tenancy

- [ ] Tenant data isolation verified
- [ ] Tenant context in all queries
- [ ] Cross-tenant access prevented
- [ ] Tenant-specific configuration
- [ ] Tenant-specific branding
- [ ] Custom domain support (optional)

## Onboarding

- [ ] Welcome email
- [ ] Setup wizard
- [ ] Default data seeded
- [ ] Documentation/help center
- [ ] In-app guidance
- [ ] Sample data option

## Customer Portal

- [ ] Account settings
- [ ] Billing management
- [ ] User management
- [ ] Audit log viewer
- [ ] API key management
- [ ] Webhook configuration
- [ ] Integration settings

## Admin Portal

- [ ] Tenant management
- [ ] User impersonation
- [ ] System health dashboard
- [ ] Usage analytics
- [ ] Support ticket management
- [ ] Configuration management

## Communication

- [ ] Email notifications
- [ ] In-app notifications
- [ ] Notification preferences
- [ ] System announcements
- [ ] Maintenance notifications

## Data Management

- [ ] Data import (CSV/Excel)
- [ ] Data export (CSV/JSON)
- [ ] Bulk operations
- [ ] Data backup per tenant
- [ ] Data retention policies

## Support

- [ ] Help center/documentation
- [ ] Contact form
- [ ] Error reporting
- [ ] Feature request system
- [ ] Status page

## Monitoring

- [ ] Per-tenant metrics
- [ ] Usage tracking
- [ ] Error rate monitoring
- [ ] Performance monitoring
- [ ] Cost tracking per tenant
