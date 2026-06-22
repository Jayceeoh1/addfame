# Next.js Authentication Flow Documentation

## Overview
This document describes the complete authentication flow for the InflueX application, detailing how users are securely authenticated and seamlessly redirected to their dashboard after successful login from `/auth/login`.

## Architecture Layers

### 1. Server-Side Authentication Layer (`app/actions/auth.ts`)

The `login()` server action is the core of the authentication flow:

**Flow Steps:**
1. **Email & Password Validation**: Validates credentials against Supabase Auth
2. **Session Creation**: Supabase creates a session token upon successful authentication
3. **Role Verification**: Fetches user role from `profiles` table to determine user type (brand/influencer)
4. **Profile Validation**: Verifies role-specific profile exists (brands or influencers table)
5. **Status Check**: Validates account status (active or rejected)
6. **Response Assembly**: Returns authenticated user data with metadata for client-side routing

**Key Return Values:**
- `success`: true/false indicating authentication status
- `data`: User and session objects
- `userRole`: 'brand' or 'influencer' for routing logic
- `approvalStatus`: 'pending' or 'approved' for user feedback

### 2. Client-Side Login Page (`app/auth/login/page.tsx`)

The login page is a Client Component managing the user interface and redirect logic:

**Authentication Workflow:**
1. User enters email and password
2. Form submission triggers server action: `await login(email, password)`
3. Server validates credentials and permissions
4. Client receives response with routing data
5. If successful, extracts `userRole` from server response
6. Immediately calls `router.push()` to appropriate dashboard
7. Middleware validates session for protected route
8. Dashboard page loads and renders

**User Feedback:**
- Loading state: Button shows "Signing in..." during request
- Error: Red alert banner with actionable message allows retry
- Setup info: Blue banner displays if account setup in progress
- Success: Automatic redirect (seamless transition)

### 3. Middleware Layer (`middleware.ts`)

Edge-level session validation ensures secure route protection:

**Responsibilities:**
1. Validates session token on every request
2. Intercepts unauthenticated users at protected routes
3. Verifies users access only their role's routes
4. Prevents unauthorized cross-role access

**Protected Routes:**
- `/brand/*`: Restricted to brand users only
- `/influencer/*`: Restricted to influencer users only

## Redirect Timeline

From login click to dashboard display:

```
1. [CLIENT] User submits login form
2. [SERVER] Validates credentials via Supabase Auth
3. [SERVER] Fetches user role from profiles table
4. [SERVER] Validates role-specific profile and status
5. [SERVER] Returns { success: true, userRole, approvalStatus }
6. [CLIENT] Receives response and checks for errors
7. [CLIENT] Displays setup info if needed (blue banner)
8. [CLIENT] Calls router.push() with dashboard URL
9. [EDGE] Middleware validates session for protected route
10. [SERVER] Dashboard page renders with initial data
11. [CLIENT] Dashboard hydrates and displays fully
```

## Error Handling

### Incorrect Credentials
- **Message**: Specific Supabase error message
- **Recovery**: User can retry on same page
- **Redirect**: None, user stays on login page

### Missing Role Profile
- **Message**: "Unable to load your profile. Please complete your registration."
- **Recovery**: User completes registration
- **Redirect**: Can be guided to registration flow

### Rejected Account
- **Message**: "This account is no longer active. Please contact support."
- **Recovery**: Contact support
- **Redirect**: None, user stays on login page

### Network Timeout
- **Message**: "An unexpected error occurred"
- **Recovery**: User can retry
- **Debugging**: Error logged to console

## Security Implementation

### Server-Side Credential Handling
- Credentials only sent to Supabase, never exposed to frontend
- Session tokens managed in HTTP-only cookies
- Admin client performs sensitive operations

### Middleware Protection
- Validates session on every protected route
- Enforces role-based access at edge
- Prevents unauthorized cross-role access

### Session Tokens
- Stored in HTTP-only cookies (XSS protection)
- Secure flag (HTTPS only)
- SameSite flag (CSRF protection)
- Automatic refresh mechanism

## Client-Side vs. Server-Side Rendering

### Server-Side Benefits (Auth Actions)
- Secure credential handling
- Database permission validation
- Token management in HTTP-only cookies
- Admin operations without exposing logic

### Client-Side Benefits (Login Page)
- Real-time form feedback
- Immediate loading states
- Seamless router navigation
- SPA-like user experience

### Hybrid Approach (Current Implementation)
```
Login Form (Client)
    ↓
Server Action (Server) ← Credentials validated securely
    ↓
Response with userRole (Server → Client)
    ↓
Router.push() (Client) ← Seamless redirect
    ↓
Middleware (Edge) ← Permission validation
    ↓
Dashboard (Server + Client) ← Data fetched and rendered
```

## Implementation Best Practices

1. **Always validate on server**: Client validation is UX only, server validation is security
2. **Use server actions for sensitive operations**: Credentials, permissions, database writes
3. **Separate concerns**: Auth logic in server actions, UI in client components
4. **Error feedback**: Be specific enough to help users, generic enough to prevent information leakage
5. **Session validation**: Middleware catches expired sessions before page loads
6. **Role-based routing**: Never trust client metadata, always fetch role from database
7. **No manual token handling**: Use Supabase SDK which handles tokens automatically
