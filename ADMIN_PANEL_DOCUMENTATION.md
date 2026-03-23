# InflueX Admin Panel - Comprehensive Documentation

## Overview

The InflueX Admin Panel is a comprehensive management interface for administering influencer profiles on the platform. Built with Next.js 16, Tailwind CSS, and shadcn/ui, the admin panel provides a secure, user-friendly interface for complete CRUD operations on influencer accounts with robust validation and error handling.

## Architecture

### Directory Structure

```
/app/admin/
├── layout.tsx                 # Admin layout with sidebar navigation
├── page.tsx                   # Dashboard homepage with KPI cards
├── influencers/
│   ├── page.tsx              # Influencer management table
│   ├── create/
│   │   └── page.tsx          # Create new influencer
│   └── [id]/
│       ├── page.tsx          # View influencer details
│       └── edit/
│           └── page.tsx      # Edit influencer profile

/components/admin/
└── influencer-form.tsx       # Reusable form component with validation

/app/actions/
└── admin.ts                  # Server actions for database operations
```

## Key Features

### 1. Influencer Management Dashboard
- **Overview Page**: Displays KPI cards showing total influencers, approved count, pending count, and growth metrics
- **Influencer List**: Comprehensive table with search functionality, status indicators, and bulk actions
- **Responsive Design**: Mobile-first approach with proper mobile, tablet, and desktop layouts

### 2. CRUD Operations

#### Create Influencer
- Form validation for all required fields (name, email, slug)
- Slug validation with specific rules:
  - Minimum 3 characters
  - Lowercase letters, numbers, and hyphens only
  - Uniqueness check against existing slugs
- Automatic data sanitization (trim whitespace, lowercase conversion)
- Real-time slug preview showing final URL
- Automatic approval status set to "approved" upon creation

#### Read Influencer
- Detail view showing all profile information
- Metadata display (creation date, last update)
- Approval status indicator
- Quick-access edit button
- Status indicators with color coding

#### Update Influencer
- Pre-populated form with existing data
- Ability to modify all editable fields
- Re-validation of slug uniqueness (excluding current record)
- Timestamp updates automatically
- Confirmation and redirect on successful save

#### Delete Influencer
- Confirmation dialog before permanent deletion
- Optimistic UI updates
- Automatic list refresh after deletion
- Error handling with user feedback

### 3. Input Validation

#### Slug Field Validation
```typescript
- Required: Cannot be null or empty
- Length: Minimum 3 characters
- Format: Only lowercase [a-z], numbers [0-9], and hyphens [-]
- Uniqueness: No duplicate slugs in database
- Automatic enforcement: Converts to lowercase, trims whitespace
```

#### Email Validation
```typescript
- Required field
- Standard email format validation
- Uniqueness check (no duplicate email addresses)
- Case-insensitive comparison (stored as lowercase)
```

#### Name Validation
```typescript
- Required: Cannot be empty
- Whitespace trimmed automatically
- Supports full names with special characters
```

#### Numeric Fields (Price)
```typescript
- Optional fields (price_from, price_to)
- Converted to integers (EUR currency)
- No negative values allowed
```

### 4. Error Handling

**Client-Side (Form Component)**:
- Real-time validation feedback
- Clear error messages displayed in alert boxes
- Field-level validation before submission
- Disabled submit button during processing
- Success confirmation with auto-redirect

**Server-Side (Admin Actions)**:
- Comprehensive error messages
- Database constraint checking (uniqueness, foreign keys)
- Graceful fallback responses
- Transaction rollback on failure
- Console logging for debugging
- Rate-limited responses to prevent abuse

**User Feedback**:
- Visual error alerts with icon and message
- Success notifications with checkmark
- Loading states during async operations
- Toast-style notifications
- Automatic redirect on success after 1.5 seconds

### 5. Slug Constraint Resolution

**Problem**: The `slug` column in the influencers table has a UNIQUE constraint, and null/empty values violate database rules.

**Solution**:
1. **Client-Side Validation**: Form validates slug before submission
2. **Server-Side Validation**: Second validation layer in server action
3. **Database Constraints**: UNIQUE constraint enforced at database level
4. **User Feedback**: Clear error messages guide users to fix invalid slugs
5. **Example Slugs**:
   - `john-doe-fitness`
   - `sarah-lifestyle-creator`
   - `tech-reviewer-2024`

## Implementation Details

### Server Actions (`app/actions/admin.ts`)

#### validateSlug Function
```typescript
function validateSlug(slug: string): { valid: boolean; error?: string }
```
- Validates slug format and length
- Prevents null/empty values
- Ensures lowercase + numbers + hyphens format

#### createInfluencer Function
```typescript
export async function createInfluencer(data: {
  name: string
  email: string
  slug: string
  bio?: string
  phone?: string
  country?: string
  niches?: string[]
  platforms?: Record<string, string>
  price_from?: number
  price_to?: number
})
```
- Validates all required fields
- Checks slug uniqueness and format
- Checks email uniqueness
- Creates record with auto-approved status
- Returns success/error response

#### updateInfluencer Function
```typescript
export async function updateInfluencer(id: string, data: {...})
```
- Validates slug if being updated
- Allows partial updates
- Excludes current record from uniqueness check
- Automatically updates timestamp

#### deleteInfluencer Function
```typescript
export async function deleteInfluencer(id: string)
```
- Performs soft/hard delete (configurable)
- Revalidates cache after deletion
- Returns success/error response

#### getAllInfluencers Function
```typescript
export async function getAllInfluencers(options?: { 
  search?: string; 
  limit?: number; 
  offset?: number 
})
```
- Supports full-text search across name, email, slug
- Pagination support
- Ordered by creation date (newest first)

### Form Component (`components/admin/influencer-form.tsx`)

**Features**:
- Reusable for both create and edit operations
- Pre-populated with initial data for editing
- Real-time validation feedback
- Slug preview showing final URL
- Organized into logical sections:
  - Basic Information (name, email, slug, bio)
  - Contact Information (phone, country)
  - Pricing (from/to rates in EUR)

**Validation Triggers**:
- On blur for individual fields (optional)
- On submit for all fields (required)
- Slug format validation with detailed feedback

### UI Components

**Dashboard Page**:
- 4 KPI cards with icons and metrics
- Recent activity feed
- Color-coded status indicators
- Responsive grid layout

**Influencer List**:
- Sortable table with columns: Name, Email, Slug, Country, Status, Actions
- Search input with clear placeholder
- Action buttons: View, Edit, Delete
- Confirmation dialogs for destructive actions
- Optimistic UI updates

**Detail Page**:
- Comprehensive profile view
- Organized sections (Profile, Pricing, Status, Metadata)
- Edit button for quick access to form
- Back navigation

**Form Pages**:
- Consistent layout with descriptive headers
- Required field indicators (*)
- Help text for complex fields
- Error/success feedback zones
- Submit and cancel actions

## Database Integration

### Table: influencers

**Relevant Columns**:
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, FOREIGN KEY)
- name (TEXT, NOT NULL)
- email (TEXT, UNIQUE, NOT NULL)
- slug (TEXT, UNIQUE, NOT NULL) ← KEY CONSTRAINT
- bio (TEXT)
- phone (TEXT)
- country (TEXT)
- niches (ARRAY)
- platforms (JSONB)
- price_from (INTEGER)
- price_to (INTEGER)
- approval_status (TEXT) - auto-set to 'approved'
- approved_at (TIMESTAMP)
- approved_by (UUID) - NULL for auto-approvals
- created_at (TIMESTAMP, DEFAULT NOW())
- updated_at (TIMESTAMP)
```

**RLS Policies**:
- Service role (admin) has full access
- Users can view approved influencers
- Users cannot insert/update others' records

## Usage Guide

### Creating an Influencer

1. Click "Add Influencer" button on influencer list
2. Fill in required fields:
   - **Name**: Full name of influencer
   - **Email**: Valid email address (must be unique)
   - **Slug**: Unique identifier for profile URL (e.g., `sarah-fitness-creator`)
3. Optional: Add bio, phone, country, pricing
4. Click "Save Influencer"
5. Redirected to influencer list on success

### Editing an Influencer

1. Click "Edit" (pencil icon) on influencer table row or detail page
2. Modify any fields
3. Click "Save Influencer"
4. Changes applied, page redirects to list

### Deleting an Influencer

1. Click "Delete" (trash icon) on influencer table row
2. Confirm in dialog
3. Record removed from database
4. Table refreshes automatically

### Searching Influencers

1. Use search input on influencer list
2. Searches across: name, email, slug
3. Results filter in real-time
4. Case-insensitive matching

## Security Considerations

1. **Admin-Only Access**: Middleware protects `/admin/*` routes (implement if needed)
2. **Server Actions**: All database operations run server-side with admin credentials
3. **Input Sanitization**: All inputs trimmed and validated
4. **SQL Injection Prevention**: Uses Supabase parameterized queries
5. **Rate Limiting**: Implement rate limiting on production
6. **Audit Trail**: Consider logging all admin actions

## Performance Optimizations

1. **Pagination**: Large lists load with pagination
2. **Search Optimization**: Full-text search on indexed columns
3. **Revalidation**: Targeted cache revalidation after mutations
4. **Client-Side State**: Optimistic updates for better UX
5. **Lazy Loading**: Forms load only when needed

## Future Enhancements

1. **Bulk Import**: CSV upload for multiple influencers
2. **Social Metrics Sync**: Auto-sync followers and engagement from social platforms
3. **Email Notifications**: Alert influencers of profile changes
4. **Audit Logging**: Track all admin actions with timestamps
5. **Role-Based Access**: Restrict admin features by permission level
6. **Advanced Filters**: Filter by niche, platform, follower count, etc.
7. **Export Reports**: Generate reports in CSV/PDF
8. **Analytics Dashboard**: Influencer performance metrics

## Troubleshooting

### Slug Already Taken Error
- Choose a different slug identifier
- Check that no other influencer has the same slug
- Valid slugs: lowercase letters, numbers, hyphens only

### Validation Errors
- Ensure all required fields (marked with *) are filled
- Check email format is valid
- Verify slug meets format requirements

### Database Connection Errors
- Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
- Check Supabase project is active
- Review database RLS policies

### Missing Records in List
- Clear browser cache
- Verify filters/search aren't hiding results
- Check user has proper permissions

## Testing Checklist

- [ ] Create influencer with all fields
- [ ] Create influencer with minimum fields
- [ ] Create influencer with duplicate slug (should fail)
- [ ] Create influencer with invalid email (should fail)
- [ ] Edit influencer and verify updates
- [ ] Delete influencer and verify removal
- [ ] Search influencers by name
- [ ] Search influencers by email
- [ ] Search influencers by slug
- [ ] Verify responsive design on mobile
- [ ] Verify error messages display correctly
- [ ] Verify success messages display correctly
- [ ] Test all validation rules

## Support

For issues or questions about the admin panel, contact the development team or check the GitHub repository issues.
