# SALF CRM v2 - Technical Architecture

## Overview

SALF CRM v2 is a modern Customer Relationship Management system built with Laravel 13 and React 19, using Inertia.js v3 for seamless SPA-like experience while maintaining server-side routing. The system is designed for sales teams to manage leads, track activities, handle calls, and automate workflows.

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| PHP | ^8.2 | Runtime |
| Laravel | 13.x | Framework |
| PostgreSQL | - | Primary Database |
| Meilisearch | - | Full-text Search (via Scout) |
| Laravel Horizon | 5.x | Queue Monitoring |
| Laravel Reverb | 1.x | WebSocket Server |
| Laravel AI | 0.x | AI integration |
| Laravel Nightwatch | 1.x | Production monitoring |
| Laravel Socialite | 5.x | OAuth / Social login |
| Spatie Permission | 6.x | Roles & Permissions |
| Spatie Activity Log | 4.x | Audit Logging |
| Spatie Media Library | 11.x | File Management |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| Inertia.js | 3.x | SPA Bridge |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 4.x | Styling |
| TanStack React Query | 5.x | Data Fetching |
| TanStack React Table | 8.x | Data Tables |
| Radix UI | - | Headless Components |
| shadcn/ui | - | Component Library |
| Recharts | 2.x | Charts & Visualizations |
| XYFlow (React Flow) | 12.x | Workflow Editor |
| Lexical | 0.40.x | Rich text editing |
| FullCalendar | 6.x | Calendar UI |

### Integrations
| Integration | SDK/Method | Purpose |
|-------------|------------|---------|
| Facebook Business | php-business-sdk v23 | Lead Forms, Pages, Ads |
| Google Calendar | OAuth 2.0 | Calendar Sync |
| Gmail | OAuth 2.0 | Email integration |
| Google Drive | OAuth 2.0 | File storage |
| Asterisk | AMI Protocol | VoIP/Call Management |

---

## Directory Structure

```
salf-crm-v2/
├── app/
│   ├── Console/Commands/      # Artisan commands
│   ├── Events/                # Domain events (28 events)
│   ├── Http/
│   │   ├── Controllers/       # HTTP controllers
│   │   │   ├── Admin/         # Admin-only controllers
│   │   │   ├── Api/           # API endpoints
│   │   │   ├── Auth/          # Authentication
│   │   │   ├── Leads/         # Lead management
│   │   │   └── Settings/      # User settings
│   │   ├── Middleware/        # Custom middleware
│   │   ├── Requests/          # Form request validation
│   │   └── Resources/         # API resources
│   ├── Jobs/                  # Background jobs
│   ├── Listeners/             # Event listeners
│   ├── Models/                # Eloquent models (42 models)
│   ├── Observers/             # Model observers
│   ├── Providers/             # Service providers
│   └── Services/              # Business logic services
├── bootstrap/
│   └── app.php               # Laravel 12 application bootstrap
├── config/                   # Configuration files
├── database/
│   ├── factories/            # Model factories
│   ├── migrations/           # Database migrations (70+)
│   └── seeders/              # Database seeders
├── resources/
│   └── js/
│       ├── actions/          # Wayfinder generated routes
│       ├── components/       # React components
│       │   ├── ui/           # shadcn/ui components (83)
│       │   ├── dashboard/    # Dashboard widgets
│       │   ├── dialer/       # Phone dialer components
│       │   ├── workflows/    # Workflow builder
│       │   └── ...           # Feature components
│       ├── hooks/            # Custom React hooks
│       ├── pages/            # Inertia pages
│       │   ├── auth/         # Authentication pages
│       │   ├── dashboard/    # Dashboard
│       │   ├── leads/        # Lead management
│       │   ├── users/        # User management
│       │   ├── tasks/        # Task management
│       │   ├── workflows/    # Workflow builder
│       │   ├── integrations/ # Integration settings
│       │   ├── zones/        # Zone management
│       │   ├── offices/      # Office management
│       │   ├── services/     # Service/Program management
│       │   └── settings/     # Application settings
│       └── types/            # TypeScript definitions
├── routes/
│   ├── web.php              # Web routes
│   ├── auth.php             # Authentication routes
│   ├── settings.php         # Settings routes
│   ├── channels.php         # Broadcasting channels
│   └── console.php          # Console commands
├── storage/                  # Storage (logs, cache, files)
├── tests/
│   ├── Browser/             # Pest browser tests
│   ├── Feature/             # Pest feature tests
│   └── Unit/                # Pest unit tests
└── vendor/                  # Composer dependencies
```

---

## Database Schema

### Core Entities

#### Users & Roles
```
users
├── id, name, email, password
├── phone, extension, company
├── availability, visibility
├── zone_id, office_id
├── facebook_user_access_token (encrypted)
├── last_assignment_at
└── timestamps

roles (Spatie)
├── id, name, guard_name
└── timestamps

permissions (Spatie)
├── id, name, guard_name
└── timestamps
```

#### Lead Management
```
leads
├── id (UUID), name, email, phone, secondary_phone
├── occupation, address, city, country
├── latitude, longitude (geo)
├── service_id, lead_source_id
├── budget (JSONB: {amount, currency}), custom_fields (JSONB), tags (JSONB: [{value,label}])
├── inquiry_status, advisor_stage, priority, inquiry_type
├── assigned_to, assigned_date
├── ticket_id, lead_score
├── qualified_by, qualified_at
├── requalified_from_advisor_id, requalify_reason
├── converted_at, loss_reason, zone_id, team_id
├── advisor_stage — sub-pipeline: new|contacted|meeting|contract_signed|initial_payment|won|lost
└── timestamps, soft_deletes

lead_cases
├── id, lead_id, advisor_id
├── initial_payment_at, initial_payment_amount
└── timestamps

lead_activities
├── id, lead_id, user_id
├── type (call, meeting, email, note, task...)
├── status, subject, description
├── scheduled_at, due_at, completed_at
├── priority, category
├── metadata (JSON)
└── timestamps

lead_sources
├── id, name, description
├── type, is_active, metadata
└── timestamps
```

#### Services & Hierarchy
```
services
├── id, name, detail
├── country_code, country_name
├── parent_id (self-reference)
├── sort_order, status
└── timestamps

service_user (pivot)
├── service_id, user_id
├── assigned_at, status, notes
├── metadata (JSONB)
└── timestamps
```

#### Geographic Territory
```
zones
├── id, name, code, description
├── country_code, is_active
├── metadata (JSON)
└── timestamps

offices
├── id, name, zone_id
├── address, phone
├── is_active
└── timestamps

countries
├── id, name, iso_code
└── timestamps

provinces
├── id, name, country_id
└── timestamps

cities
├── id, name, province_id
└── timestamps

city_zone (pivot)
├── city_id, zone_id
└── timestamps
```

#### Call Management
```
call_sessions
├── id, uniqueid
├── caller_id, lead_id
├── caller_number, callee_number
├── direction (inbound/outbound)
├── status, duration_seconds
├── recording_path, notes
├── sip_account_id, channel
├── answered_at, ended_at
└── timestamps

sip_accounts
├── id, user_id
├── username, domain, password
├── realm, transport
├── is_enabled, status
└── timestamps

call_logs
├── id, call_session_id
├── event_type, event_data
└── timestamps
```

#### Task Management
```
tasks
├── id, user_id, taskable_type, taskable_id
├── type, title, description
├── due_at, completed_at, priority
├── status, metadata (JSON)
└── timestamps
```

#### Workflows
```
workflows
├── id, name, description
├── trigger_type, trigger_config
├── is_active
└── timestamps

workflow_steps
├── id, workflow_id
├── type, name, config
├── position_x, position_y
└── timestamps

workflow_step_connections
├── id, workflow_id
├── source_step_id, target_step_id
└── timestamps
```

---

## Application Architecture

### Request Flow
```
HTTP Request → Laravel Router → Middleware → Controller
     ↓
Controller → Service Layer → Model/Repository
     ↓
Inertia::render() → React Page Component
     ↓
Browser SPA ← JSON Response
```

### Middleware Stack
1. `HandleAppearance` - Theme preferences
2. `HandleInertiaRequests` - Inertia shared data
3. `AddLinkHeadersForPreloadedAssets` - Asset preloading
4. `calendar.errors` - Calendar integration error handling

### Event-Driven Architecture

The system uses Laravel events extensively:

**Lead Events:**
- `LeadAssigned` - When lead is assigned to user
- `LeadQualified` - When lead is qualified by CRO
- `LeadUpdated` / `LeadDeleted`

**Call Events:**
- `CallInitiated` - Outbound call started
- `CallAnswered` - Call was answered
- `CallEnded` - Call completed
- `CallStateChanged` - Real-time call state updates
- `CallRecordingProcessed` - Recording available
- `InboundCallReceived` - Incoming call via Asterisk

**Task Events:**
- `TaskCreated`, `TaskUpdated`, `TaskDeleted`
- `TaskDueReminder`, `TaskOverdue`

**Integration Events:**
- `FacebookConnected`, `FacebookDisconnected`
- `FacebookLeadProcessed`, `FacebookDataSynced`
- `FacebookHealthStatusChanged`

### Services Layer

**IntelligentAssignmentService** (`app/Services/IntelligentAssignmentService.php`)
- Weighted round-robin lead distribution
- Zone-aware advisor assignment
- CRO and Advisor capacity management
- Performance-based scoring

```php
// Assignment Algorithm Score Calculation
Score = 100
  - Workload Penalty (0-40 based on capacity)
  + Performance Bonus (conversion rate)
  + Conversion Rate Bonus (up to 20)
  - Recency Penalty (prevents consecutive assignments)
```

### Real-time Features

**Laravel Reverb WebSockets:**
- Live call status updates
- Task notifications
- Lead assignment notifications
- Dashboard real-time metrics

**Broadcasting Channels:**
- Private user channels
- Call session channels
- Lead activity channels

---

## Frontend Architecture

### Component Hierarchy
```
App Shell
├── AppSidebar (navigation)
├── AppHeader (search, notifications, user menu)
└── AppContent (page content)
    └── Inertia Page Component
        └── Feature Components
            └── UI Components (shadcn/ui)
```

### State Management
- **Server State:** TanStack React Query for API data
- **Form State:** React Hook Form with Zod validation
- **UI State:** React useState/useContext

### Key Frontend Patterns

**Data Tables:**
- TanStack Table for complex data grids
- Column resizing, pinning, sorting
- Infinite scrolling with react-window

**Forms:**
- Inertia `<Form>` component for server forms
- `useForm` hook for programmatic control
- Zod schema validation

**Dialogs/Sheets:**
- Radix Dialog for modals
- Vaul for slide-over sheets
- Consistent create/edit patterns

---

## API Design

### Internal API Routes (Inertia)
```
/dashboard              → Dashboard page
/leads                  → Lead list
/leads/{id}             → Lead detail (via dialog)
/users                  → User management
/tasks                  → Task management
/workflows              → Workflow builder
/integrations           → Integration settings
```

### API Endpoints (`/api/...`)
```
GET  /api/dashboard/overview       → Dashboard metrics
GET  /api/dashboard/lead-analytics → Lead analytics
GET  /api/leads/{lead}/calls       → Lead call history
POST /api/calls/initiate           → Start outbound call
GET  /api/calls/active             → Active calls
POST /api/asterisk/call-lead       → Create lead from call
```

### External Webhooks
```
POST /asterisk/inbound-call        → Asterisk AMI webhook
POST /facebook/webhook             → Facebook Lead Forms
GET  /facebook/webhook             → Facebook verification
```

---

## Security Architecture

### Authentication
- Laravel built-in authentication
- Email verification required
- Session-based with remember tokens

### Authorization
- Spatie Permission for roles/permissions
- Gate policies for resource access
- Middleware-based route protection

### Data Protection
- Encrypted Facebook tokens
- Password hashing (bcrypt)
- CSRF protection (Inertia)
- Rate limiting on sensitive endpoints

---

## Search Architecture

### Meilisearch Integration
```php
// Lead searchable fields
'searchableAttributes' => [
    'name', 'email', 'phone', 'occupation',
    'address', 'city', 'country', 'detail',
    'service_name', 'assigned_user_name'
]

// Filterable attributes
'filterableAttributes' => [
    'inquiry_status', 'priority', 'service_id',
    'assigned_to', 'is_hot_lead', 'zone_id'
]
```

### Full-text Search Features
- Typo tolerance
- Faceted filtering
- Custom ranking (lead_score, is_hot_lead)
- Geo-location search

---

## Deployment Architecture

### Environment
- Laravel Herd (development)
- Queue: Horizon with Redis
- WebSocket: Laravel Reverb
- Search: Meilisearch

### Required Services
1. PostgreSQL database
2. Redis (queues, cache, sessions)
3. Meilisearch instance
4. Asterisk server (for calls)

### Build Process
```bash
npm run build          # Frontend assets
php artisan optimize   # Cache routes, config, views
php artisan migrate    # Database migrations
```

---

## Testing Strategy

### Test Types
- **Feature Tests:** HTTP endpoint testing with Pest
- **Unit Tests:** Service layer isolation
- **Browser Tests:** Pest v4 + Playwright

### Test Commands
```bash
php artisan test                          # All tests
php artisan test --filter=LeadController  # Filtered
php artisan test tests/Feature/           # Feature only
```

---

## Performance Optimizations

### Database
- PostgreSQL JSONB for flexible metadata
- Proper indexes on foreign keys
- Eager loading to prevent N+1
- Query caching with Redis

### Frontend
- Code splitting with Vite
- React Query caching
- Virtualized lists (react-window)
- Deferred props (Inertia v2)

### Caching
- Model-level cache keys
- Assignment statistics caching
- API response caching

---

## Monitoring & Logging

### Logging
- Spatie Activity Log for audit trail
- Laravel logs for errors/debug
- Call session logging

### Queue Monitoring
- Laravel Horizon dashboard
- Job failure notifications
- Queue metrics

### Scheduled Tasks
```php
// Every 15 minutes
$schedule->command('tasks:check-reminders')
```