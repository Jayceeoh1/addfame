# Automated Account Approval System

## Overview

This document describes the fully automated account approval system that instantly approves all new user accounts upon creation without requiring manual admin intervention. This ensures seamless, delay-free access for users while maintaining data integrity and security.

## Architecture

### Instant Approval Upon Registration

When a new user registers (either as a Brand or Influencer), the system automatically sets their account status to **`'approved'`** immediately during the account creation process. This eliminates any pending state that would delay user access.

### Key Design Principles

1. **Zero Delay Access** - Users can log in and access the platform immediately after registration completion
2. **No Admin Intervention** - Approval happens automatically via code logic, not manual processes
3. **Data Integrity** - Approval status is set atomically during initial profile creation to prevent inconsistent states
4. **Audit Trail** - The `approved_at` timestamp is captured at registration time for compliance and auditing purposes

## Implementation Details

### 1. Account Creation Flow

**Registration Process:**
```
User submits registration → Validate inputs → Create auth user → 
Create base profile → Create role-specific profile with approval_status='approved' → 
Capture approved_at timestamp → Redirect to dashboard
```

### 2. Approval Status Field

The `approval_status` field in both `brands` and `influencers` tables uses the following values:

| Status | Meaning | User Access |
|--------|---------|------------|
| `'approved'` | Auto-approved at registration | ✅ Full access immediately |
| `'rejected'` | Disabled by admin (manual only) | ❌ Login blocked, contact support |

**No pending state exists** - all newly registered accounts are automatically approved.

### 3. Database Schema

Both `brands` and `influencers` tables include:
- `approval_status TEXT` - Set to `'approved'` at registration
- `approved_at TIMESTAMP` - Set to current timestamp at registration
- `approved_by UUID` - NULL for auto-approved accounts (auto-approval has no specific admin)

### 4. Server-Side Implementation

**Registration Actions** (`app/actions/auth.ts`):

```typescript
// Both registerBrand() and registerInfluencer() create profiles with:
const profileData = {
  user_id: userId,
  email: email,
  name: sanitizeText(name),
  // ... other fields
  approval_status: 'approved',        // ✅ Auto-approved
  approved_at: new Date().toISOString(), // ✅ Timestamp captured
}

const { error } = await adminClient.from('table').upsert(profileData)
```

### 5. Login Flow

**No approval check during login** - Login validation only checks for the `'rejected'` status. Since all new accounts are auto-approved, users can log in immediately:

```typescript
if (roleProfileData.approval_status === 'rejected') {
  return { error: 'This account is no longer active...' }
}
// Auto-approved accounts proceed directly to dashboard
```

### 6. Error Handling and Data Integrity

**Retry Safety:**
- Uses `upsert` with `onConflict: 'id'` to safely handle retries
- If a user retries registration, the existing approved account is preserved
- No duplicate email errors on retry

**Atomic Operations:**
- Profile and approval status are created in a single operation
- Prevents inconsistent states where profile exists but isn't approved

**Rate Limiting:**
- Email rate limit errors are handled gracefully
- Users can retry after the rate limit window passes
- Provides `rateLimited: true` flag in response for UI feedback

## Benefits

| Benefit | Impact |
|---------|--------|
| Zero-delay access | Users can start using the platform immediately |
| Reduced support burden | No approval queue or admin workload |
| Improved conversion | No waiting period discourages user abandonment |
| Simplified operations | No need for approval workflows or admin dashboards |
| Better UX | Seamless onboarding without friction |
| Auditable | `approved_at` timestamp provides compliance record |

## Monitoring and Auditing

**Tracking Auto-Approved Accounts:**
```sql
SELECT COUNT(*) as auto_approved_count 
FROM brands 
WHERE approval_status = 'approved' 
AND approved_by IS NULL;
```

**Approval Timeline:**
```sql
SELECT email, created_at, approved_at, 
  EXTRACT(EPOCH FROM (approved_at - created_at)) as approval_time_seconds
FROM brands
WHERE approval_status = 'approved'
ORDER BY approved_at DESC;
```

## Security Considerations

1. **Rejection Still Available** - Admins can manually reject accounts via database if needed, blocking future logins
2. **Session Validation** - Login still validates session state and user permissions via middleware
3. **RLS Policies** - Database-level row-level security prevents unauthorized data access
4. **Retry Protection** - Duplicate account checks prevent email account takeover via retry attacks

## Future Enhancement Options

If needed in the future, this system can be extended with:

1. **Conditional Approval** - Approve based on criteria (domain whitelist, verification, etc.)
2. **Delayed Approval** - Queue for manual approval while allowing limited access
3. **Staged Onboarding** - Require additional steps before full feature access
4. **Risk Assessment** - Flag suspicious registrations for review while allowing platform access

## Related Files

- `app/actions/auth.ts` - Core registration and approval logic
- `app/auth/register/page.tsx` - User registration UI
- `app/auth/login/page.tsx` - Login flow (no pending approval messaging)
- `middleware.ts` - Session validation and permission checks
- Database schema: `brands.approval_status`, `influencers.approval_status`
