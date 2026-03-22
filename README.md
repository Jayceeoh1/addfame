# InflueX - Influencer Marketing Platform

A premium, production-ready influencer marketing SaaS platform built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Features

### Platform Overview
- **Unified App with Role-Based Access**: Single application with separate dashboards for Brands, Influencers, and Admins
- **Vibrant & Energetic Design**: Modern, premium UI inspired by FameUp with teal/coral gradient accents
- **Real-Time Collaboration**: Campaign management, influencer discovery, and messaging
- **EUR Currency**: All pricing and transactions in EUR
- **Multi-Platform Support**: TikTok and Instagram fully enabled, YouTube marked as "Coming Soon"

### Brand Features
- Campaign management with creation, editing, and status tracking
- Influencer discovery and filtering by platform, niche, followers, and location
- Collaboration tracking with status updates (INVITED, ACCEPTED, ACTIVE, COMPLETED)
- Analytics dashboard with KPI cards and campaign metrics
- Wallet management for budget allocation and spending tracking
- Inbox for brand-influencer communication
- Settings for brand profile customization

### Influencer Features
- Browse available campaigns with filtering options
- Apply to campaigns and manage collaborations
- Profile management with social account linking (TikTok/Instagram)
- Earnings overview and wallet management
- Deliverable upload and tracking
- Notifications for campaign opportunities
- Settings and notification preferences

### Technical Stack
- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Storage**: Supabase Storage for file uploads
- **Server Actions**: For secure CRUD operations
- **Middleware**: Route protection and session management

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account with project created
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo>
   cd influex
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**
   
   The application uses these main tables:
   - `profiles` - User authentication and roles
   - `brands` - Brand profile information
   - `influencers` - Influencer profile information
   - `campaigns` - Campaign details and status
   - `messages` - Messaging between brands and influencers
   - `transactions` - Wallet transactions
   - And supporting tables for collaborations, deliverables, metrics

   The schema is already configured in your Supabase project based on the provided SQL.

5. **Run the Development Server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── (auth)/              # Authentication routes
│   ├── login/
│   └── register/
├── (onboarding)/        # Onboarding flow
│   └── start/
├── (brand)/             # Brand dashboard routes
│   ├── layout.tsx       # Brand layout with sidebar
│   ├── dashboard/
│   ├── campaigns/
│   ├── influencers/
│   ├── collaborations/
│   ├── inbox/
│   ├── wallet/
│   └── settings/
├── (influencer)/        # Influencer dashboard routes
│   ├── layout.tsx       # Influencer layout with sidebar
│   ├── dashboard/
│   ├── campaigns/
│   ├── collaborations/
│   ├── inbox/
│   ├── wallet/
│   ├── profile/
│   └── settings/
├── actions/             # Server actions for API calls
├── layout.tsx           # Root layout
├── globals.css          # Global styles with design tokens
└── page.tsx             # Landing page

lib/
├── supabase/
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server client
│   └── middleware.ts    # Auth middleware
└── utils.ts             # Utility functions

hooks/
└── use-profiles.ts      # Custom hooks for data fetching

components/
└── ui/                  # shadcn/ui components (auto-generated)

middleware.ts           # Next.js middleware for route protection
```

## Key Features Implementation

### Authentication Flow
1. User signs up with email/password and selects role (BRAND or INFLUENCER)
2. Profile created in Supabase auth and `profiles` table
3. Multi-step onboarding (role selection → profile info → confirmation)
4. Middleware redirects to appropriate dashboard based on role
5. Session management via Supabase auth cookies

### Campaign Management
- Brands create campaigns with title, platform, budget, deadline, requirements
- Campaigns stored in `campaigns` table with status tracking
- Platforms: TikTok and Instagram are fully enabled
- YouTube shown as "Coming Soon" in UI (cannot create YouTube campaigns yet)
- Real-time budget and metrics tracking

### Influencer Discovery
- Browse campaigns filtered by platform, niche, location
- Filter by follower count and engagement rate
- Apply to campaigns with one click
- Shortlist feature for future collaboration

### Analytics Dashboard
- KPI cards for active campaigns, spend, reach, influencers
- Campaign metrics with charts
- Deliverable tracking and review status
- Transaction history and wallet management

### Role-Based Access
- Middleware protects routes based on `profiles.role`
- `/brand/*` - Only accessible to BRAND and ADMIN roles
- `/influencer/*` - Only accessible to INFLUENCER and ADMIN roles
- Public pages: `/`, `/login`, `/register`, `/start`

## Design System

### Color Palette
- **Primary**: Vibrant Teal (`oklch(0.53 0.22 200.18)`)
- **Secondary/Accent**: Coral (`oklch(0.65 0.19 16.54)`)
- **Background**: Light (`oklch(0.98 0.002 203.46)`)
- **Dark**: Deep Navy (`oklch(0.12 0 0)`)

### Typography
- **Font Family**: Geist (sans-serif), Geist Mono
- **Heading**: Bold, up to 3xl
- **Body**: Regular, responsive sizes

### Components
- Rounded corners with 0.625rem radius
- Soft shadows for depth
- Smooth transitions
- Gradient accents on buttons and headers

## Database Schema

### Core Tables

**profiles**
- User authentication mapping with role assignment
- Tracks user ID, email, and role (BRAND/INFLUENCER/ADMIN)

**brands**
- Brand profile details (name, website, industry, description)
- Logo and metadata storage

**influencers**
- Influencer profile (name, bio, city, country, niche)
- Social media handles and engagement metrics

**campaigns**
- Campaign details (title, platform, budget, deadline)
- Status tracking (DRAFT, LIVE, COMPLETED)
- Deliverables and requirements

**messages**
- Messaging between brands and influencers
- Thread-based conversations

**transactions**
- Payment history and wallet transactions
- EUR-based amounts

## Environment Variables

Required in `.env.local`:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyXXXXX
SUPABASE_SERVICE_ROLE_KEY=eyXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Running Locally

1. **Development Server**
   ```bash
   pnpm dev
   ```

2. **Build for Production**
   ```bash
   pnpm build
   pnpm start
   ```

3. **Code Generation**
   ```bash
   pnpm generate
   ```

## Testing Role-Based Access

### Testing as Brand
1. Navigate to `/register`
2. Select "Brand" role
3. Fill in brand details in onboarding
4. Access `/brand/dashboard`

### Testing as Influencer
1. Navigate to `/register`
2. Select "Influencer" role
3. Fill in influencer details in onboarding
4. Access `/influencer/dashboard`

### Testing Route Protection
- Try accessing `/brand/dashboard` while logged in as influencer → redirects to influencer dashboard
- Try accessing authenticated routes without login → redirects to `/login`

## Future Enhancements

- Messaging system with real-time WebSocket updates
- Payment integration with Stripe for EUR payments
- YouTube campaign support (currently marked as "Soon")
- Advanced analytics with charts and graphs
- Video preview in deliverables
- Admin dashboard for user management
- Notification system with email integration
- Two-factor authentication
- Social media account verification

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository in Vercel
3. Add environment variables in Vercel settings
4. Deploy automatically on push

### Environment Setup on Vercel
Add these in Vercel Project Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Authentication Issues
- Check if Supabase credentials are correct in `.env.local`
- Verify email confirmation is enabled in Supabase Auth settings
- Clear browser cookies and try again

### Database Errors
- Ensure RLS policies are enabled on all tables
- Check Supabase console for error logs
- Verify user has correct role in `profiles` table

### Style Issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `pnpm build`
- Ensure Tailwind CSS is properly configured

## Support

For issues and questions, please open an issue on GitHub or check the documentation.

## License

MIT License - see LICENSE file for details
