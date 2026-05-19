# SALF CRM v2 - Product Documentation

## Product Overview

SALF CRM v2 is a comprehensive Customer Relationship Management system designed for sales teams and customer service organizations. It provides end-to-end lead management, intelligent lead distribution, call center integration, and workflow automation.

---

## Core Value Propositions

1. **Intelligent Lead Distribution** - Automated assignment based on workload, performance, and geography
2. **Unified Communication** - Integrated VoIP calling via Linphone with call recording and tracking
3. **Territory Management** - Zone-based routing for geographic sales territories
4. **Multi-channel Lead Capture** - Facebook Lead Forms, web forms, manual entry
5. **Sales Pipeline Visibility** - Real-time dashboards and analytics
6. **Workflow Automation** - Visual workflow builder for process automation
7. **Privacy Protection** - CROs never see actual customer phone numbers

---

## User Roles

### Super Admin
- Full system access
- User and role management
- Facebook token administration
- System configuration

### CRO (Customer Relations Officer)
- Receives new leads for qualification
- Qualifies leads and routes to advisors
- Manages lead initial contact
- Workload: up to 50 active leads
- **Note:** Cannot view actual customer phone numbers for privacy

### Sales Representative / Advisor
- Works qualified leads
- Converts leads to customers
- Geographic territory assignment
- Workload: up to 30 active leads

### Support Agent / Senior Support Agent
- Customer support functions
- Call handling
- Escalation management

---

## Feature Modules

### 1. Lead Management

#### Lead Capture
- **Manual Entry**: Create leads with full contact details
- **Facebook Lead Forms**: Automatic sync from Facebook campaigns
- **Web Forms**: Embedded form integration
- **Inbound Calls**: Auto-create leads from calls

#### Lead Information
| Field | Description |
|-------|-------------|
| Contact Info | Name, email, phone, address |
| Location | City, country, coordinates (geo) |
| Service Interest | Primary service/program of interest |
| Budget | Amount and currency |
| Priority | Low, Medium, High, Urgent |
| Lead Score | 0-100 algorithmic score |
| Tags | Custom tagging system |
| Custom Fields | Flexible additional data |

#### Lead Statuses (Lifecycle)
```
new → assigned_to_cro → contacted → qualified
                                         ↓
                               assigned_to_advisor
                                         ↓ (advisor_stage sub-pipeline)
                               new → contacted → meeting → contract_signed → initial_payment → won
                                                                           ↘ lost (from any advisor stage)
                                         ↓
                               lost / unqualified / requalify
requalify → back to qualified_by CRO
nurturing (long-term hold, any point)
```

> **Note:** `assigned_to_cro` and `assigned_to_advisor` are explicit pipeline statuses — not derived from `assigned_to` + user role. Status tracks *where in the pipeline* the lead is; `assigned_to` tracks *who currently holds it*. Both are required.

| Status | Description |
|--------|-------------|
| `new` | Fresh lead, not yet assigned |
| `assigned_to_cro` | CRO is qualifying the lead |
| `contacted` | CRO has made initial contact |
| `qualified` | Lead verified as genuine opportunity |
| `assigned_to_advisor` | In advisor sales pipeline (see advisor stages below) |
| `converted` | Successfully converted |
| `won` | Deal closed (set by advisor via `initial_payment → won` stage) |
| `lost` | Opportunity lost (requires `loss_reason`) |
| `unqualified` | Not a valid lead (requires `loss_reason`) |
| `requalify` | Advisor sent back to original qualifying CRO |
| `nurturing` | Long-term follow-up hold |
| `closed` | Terminal closed state |

#### Advisor Sub-Pipeline Stages

When a lead is `assigned_to_advisor`, it progresses through `advisor_stage`:

| Stage | Description | Side Effects |
|-------|-------------|-------------|
| `new` | Just assigned to advisor | Set automatically on assignment |
| `contacted` | Advisor made contact | Activity logged |
| `meeting` | Meeting scheduled/held | Visible to Processing dept |
| `contract_signed` | Contract signed | Creates `LeadCase` record |
| `initial_payment` | Initial payment received | Updates `LeadCase` with payment amount + date |
| `won` | Deal closed | Sets `inquiry_status = won`, `converted_at` |
| `lost` | Deal lost (from any stage) | Sets `inquiry_status = lost`, stores `loss_reason` |

Allowed transitions (enforced server-side):
```
new → contacted | lost
contacted → meeting | lost
meeting → contract_signed | lost
contract_signed → initial_payment | lost
initial_payment → won | lost
```

**Processing Department Visibility:** Leads with `advisor_stage` in `[meeting, contract_signed, initial_payment, won]` are visible to the processing role (configured in `config/processing.php`).

#### Lead Scoring
Automatic scoring based on (base score 50, max 100):
- Business email, not gmail.com (+10 points)
- Phone number present (+10 points)
- Job title is CEO/CTO/Manager/Director (+10 points)
- Lead source score from `lead_sources.source_score` (variable)
- Budget amount > 0 (+10 points)
- Each activity in last 7 days (+5, capped at +20 total)

**Hot Lead Criteria:** Score >= 80 OR (priority = `high` AND status in `[new, contacted]`)

#### Lead Search & Filtering
- Full-text search across all fields
- Phone number search (normalized)
- Filter by status, priority, service, source
- Filter by assigned user, date range
- Geographic filtering
- Tag-based filtering

---

### 2. Intelligent Lead Distribution

#### Assignment Algorithm
The system uses a weighted round-robin algorithm considering:

1. **Workload** - Current lead count vs. capacity
2. **Performance** - Historical conversion rate
3. **Recency** - Time since last assignment (prevents back-to-back)
4. **Specialization** - Service expertise match
5. **Geography** - Zone-based territory matching

#### CRO Assignment Flow
```
New Lead Created
      ↓
Check Available CROs (role: support-agent, senior-support-agent)
      ↓
Filter: Active, Available, Under Capacity (50 leads max)
      ↓
Score each CRO by weighted algorithm
      ↓
Assign to highest scoring CRO
      ↓
Create follow-up task (due in 24 hours)
```

#### Advisor Assignment Flow
```
Lead Qualified by CRO
      ↓
Determine Lead's Zone (from city/location)
      ↓
Find Advisors (role: sales-rep)
      ↓
Priority 1: Same zone + Same service specialization
Priority 2: Same zone (any service)
Priority 3: Same service (any zone)
Priority 4: Any available advisor
      ↓
Score and assign to best match
```

#### Performance Metrics Tracked
- `current_lead_count` - Active leads
- `total_leads_assigned` - Lifetime assignments
- `qualified_leads_count` - Successful qualifications
- `converted_leads_count` - Successful conversions
- `conversion_rate` - Percentage converted
- `performance_weight` - Algorithm multiplier

---

### 3. Call Center Integration

#### Architecture Overview
The call system uses a multi-component architecture:
- **CRM System** - User interface and data storage
- **Asterisk AMI** - Call routing and control via Manager Interface
- **Linphone** - Softphone client for making/receiving calls

#### Privacy Protection
- **CROs cannot see actual phone numbers** - Phone numbers are masked for privacy
- All calls are routed through the system to protect customer data
- Only authorized roles can access full contact information

#### Call Flow (Inbound)
```
Customer calls → Asterisk PBX
      ↓
Asterisk routes call → Linphone (User's softphone)
      ↓
AMI webhook notifies CRM system
      ↓
CRM matches caller to lead (if exists)
      ↓
CRM displays incoming call dialog to user
      ↓
User answers call in Linphone
      ↓
CRM stores call session info:
- Start time, caller info
- Lead association
- Recording reference
      ↓
On call end:
- Duration logged
- User can add notes
- Activity created on lead
```

#### Call Flow (Outbound)
```
User clicks "Call" button on lead
      ↓
CRM sends request to Asterisk AMI
      ↓
Asterisk initiates call
      ↓
Asterisk connects user's Linphone to customer
      ↓
CRM displays call status dialog
      ↓
Real-time status updates (ringing, answered, ended)
      ↓
On call end:
- Call session saved
- Recording stored
- Activity logged on lead
```

#### CRM Call Features
The CRM provides:
- **Incoming Call Notifications** - Dialog shows when call arrives
- **Call Status Display** - Real-time call state (ringing, connected, etc.)
- **Call Recording** - Recordings stored and playable from lead record
- **Call Notes** - Add notes during or after calls
- **Call History** - Complete log of all calls per lead
- **New Lead Creation** - Create lead directly from inbound call

#### Call Information Stored
| Field | Description |
|-------|-------------|
| Direction | Inbound / Outbound |
| Caller Number | Initiating number (masked for CRO) |
| Callee Number | Receiving number |
| Status | Ringing, Answered, Ended, Missed, etc. |
| Duration | Call length in seconds |
| Recording Path | Location of call recording |
| Notes | User-entered call notes |
| Lead ID | Associated lead |
| User ID | CRM user who handled call |
| SIP Account | User's SIP/Linphone account |
| Unique ID | Asterisk call identifier |

#### SIP Account Management
- Each user has SIP account credentials for Linphone
- Account registration status tracking
- Enable/disable accounts
- Multiple accounts per user supported

---

### 4. Activity & Task Management

#### Activity Types
| Type | Description |
|------|-------------|
| Call | Phone call (logged automatically or manually) |
| Email | Email correspondence |
| Meeting | Scheduled meetings |
| Note | General notes/comments |
| Task | Action items |
| Follow-up | Scheduled follow-ups |
| Message | Text/chat messages |
| Status Change | Status updates |
| Assignment Change | Ownership changes |
| Document | Document uploads |

#### Task Features
- Task creation with due dates
- Priority levels (Low, Medium, High, Urgent)
- Task reminders (checked every 15 minutes)
- Overdue task notifications
- Task completion tracking
- Polymorphic tasks (linked to leads, etc.)

#### Activity Timeline
- Chronological activity feed per lead
- Filter by activity type
- Quick action buttons
- Scheduled activity calendar

---

### 5. Territory (Zone) Management

#### Geographic Hierarchy
```
Country
  └── Province/State
        └── City
              └── Zone (can span multiple cities)
                    └── Office
                          └── Users
```

#### Zone Features
- Define sales territories
- Multi-city zone assignments
- Zone-specific user assignments
- Lead routing by zone
- Zone performance reporting

#### Office Management
- Physical office locations
- Office-zone association
- User-office assignments
- Office contact information

---

### 6. Service/Program Management

#### Hierarchical Services
```
Parent Service (e.g., "MBA Programs")
  ├── Child Service (e.g., "MBA Finance")
  ├── Child Service (e.g., "MBA Marketing")
  └── Child Service (e.g., "MBA HR")
```

#### Service Features
- Country-specific services
- User-service specialization (many-to-many)
- Service-based lead routing
- Service performance tracking
- Service hierarchy reporting

---

### 7. Dashboard & Analytics

#### Overview Metrics
- Total leads by status
- New leads today/week/month
- Conversion rates
- Revenue pipeline
- Active calls

#### Lead Analytics
- Lead source performance
- Conversion by service
- Geographic distribution
- Lead lifecycle funnel
- Activity heatmap

#### User Performance
- Individual conversion rates
- Workload distribution
- Response time metrics
- Task completion rates

#### Charts & Visualizations
- Funnel charts
- Pie/Donut charts
- Line/Area charts (trends)
- Bar charts (comparisons)
- Heatmaps (activity patterns)

---

### 8. Integrations

#### Facebook Integration
**Features:**
- OAuth connection per user
- Facebook Page management
- Lead Form synchronization
- Automatic lead creation
- Campaign tracking (Campaign > Ad Set > Ad > Form)
- Webhook for real-time lead capture

**Setup Flow:**
```
User connects Facebook account
      ↓
Select Facebook Pages
      ↓
Subscribe to lead webhooks
      ↓
Configure field mappings
      ↓
Enable auto-sync
```

**Token Management:**
- Encrypted token storage
- Token expiry monitoring
- Refresh token handling
- Admin token overview dashboard

#### Google Calendar Integration
- OAuth connection
- Calendar sync
- Meeting scheduling from CRM
- Bi-directional event sync

---

### 9. Workflow Automation

#### Visual Workflow Builder
- Drag-and-drop interface (React Flow)
- Node-based workflow design
- Trigger configuration
- Conditional branching

#### Trigger Types
- Lead Created
- Lead Status Changed
- Lead Assigned
- Time-based (scheduled)
- Manual trigger

#### Action Types
- Assign to user
- Change status
- Send notification
- Create task
- Update field
- External webhook

#### Workflow Testing
- Test mode for validation
- Execution logging
- Error handling

---

### 10. User Management

#### User Features
- Profile management
- Password reset
- Avatar upload
- Availability toggle
- SIP account configuration (for Linphone)

#### Role-Based Access
- Permission-based feature access
- Role hierarchy
- Custom role creation
- Bulk permission updates

#### User Settings
- Theme preference (light/dark)
- Notification preferences
- Default views
- Timezone settings

---

## UI/UX Patterns

### Navigation
- Collapsible sidebar navigation
- Breadcrumb navigation
- Quick search (Cmd+K)
- Recent items

### Data Display
- Data grid with column resizing/pinning
- Card-based layouts
- Detail dialogs (slide-over)
- Infinite scroll lists

### Forms
- Inline validation
- Auto-save capability
- Multi-step forms
- Dynamic field visibility

### Notifications
- Toast notifications (Sonner)
- Real-time updates
- Task reminders
- System alerts

---

## Mobile Considerations

The UI is responsive with:
- Mobile-friendly navigation
- Touch-optimized controls
- Responsive data tables
- Mobile-friendly call dialogs

---

## Security Features

### Data Protection
- Role-based access control
- Field-level permissions (phone number masking for CRO)
- Audit logging
- Data export controls

### Privacy
- Customer phone numbers hidden from CRO role
- Call routing through PBX (no direct numbers exposed)
- Encrypted sensitive data storage

### Compliance
- Activity logging
- Change tracking
- Soft deletes (data retention)
- Encrypted sensitive data

---

## Reporting Capabilities

### Standard Reports
- Lead conversion report
- Source performance report
- User productivity report
- Pipeline value report
- Activity summary
- Call statistics

### Export Options
- CSV export
- Filtered exports
- Custom date ranges

---

## System Requirements

### For Users
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- **Linphone softphone client** (for making/receiving calls)
- Microphone/headset for calling

### For Deployment
- PostgreSQL 14+
- Redis 6+
- Meilisearch 1.x
- PHP 8.3+
- Node.js 18+
- Asterisk PBX (for VoIP routing)

---

## Glossary

| Term | Definition |
|------|------------|
| CRO | Customer Relations Officer - First contact for new leads |
| Advisor | Sales Representative - Works qualified leads |
| Zone | Geographic sales territory |
| Lead Score | Algorithmic quality score (0-100) |
| Hot Lead | High-priority lead (score 80+ or high priority) |
| Qualified | Lead verified as genuine sales opportunity |
| Converted | Lead successfully became a customer |
| SIP | Session Initiation Protocol (VoIP standard) |
| AMI | Asterisk Manager Interface - API for call control |
| Linphone | Open-source softphone client for VoIP calls |
| PBX | Private Branch Exchange - Phone system (Asterisk) |