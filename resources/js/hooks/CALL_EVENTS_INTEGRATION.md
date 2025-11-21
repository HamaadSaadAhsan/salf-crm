# Call Events Integration Guide

## Overview

The call system now uses Laravel broadcast events for real-time updates. The Node.js server (`server.js`) handles all database operations for call tracking, while Laravel broadcasts events to the frontend for real-time UI updates.

## Architecture

```
┌─────────────────┐        ┌──────────────┐        ┌─────────────────┐
│   Asterisk AMI  │  AMI   │  Node.js     │  HTTP  │    Laravel      │
│                 │ ──────>│  server.js   │ ──────>│  (Broadcast)    │
│  (PBX System)   │ Events │              │  POST  │                 │
└─────────────────┘        └──────────────┘        └─────────────────┘
                                  │                          │
                                  │ PostgreSQL               │ WebSocket
                                  ▼                          ▼
                           ┌──────────────┐        ┌─────────────────┐
                           │   Database   │        │  React Frontend │
                           │ (call_sessions,│      │  (Echo Listener)│
                           │  call_logs)   │      │                 │
                           └──────────────┘        └─────────────────┘
```

## Broadcast Events

### 1. CallStateChanged Event
Broadcasts when call state changes (initiated, ringing, answered, ended, failed).

**Channels:**
- `call-session.{session_id}` - Specific call session
- `user.{caller_id}` - Caller's private channel
- `lead.{lead_id}` - Lead's channel (if associated)

**Event Name:** `call.state.changed`

**Data:**
```typescript
{
    session_id: string;
    status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed';
    caller_id?: number;
    caller_number?: string;
    callee_number?: string;
    lead_id?: number;
    end_reason?: string;
    timestamp: string;
}
```

### 2. CallStatusChanged Event
Broadcasts when call status is explicitly updated.

**Channels:**
- `call-session.{session_id}` - Specific call session
- `lead.{lead_id}` - Lead's channel (if associated)

**Event Name:** `call.status.changed`

**Data:**
```typescript
{
    session_id: string;
    status: 'ringing' | 'answered' | 'ended' | 'declined';
    lead_id?: number;
    end_reason?: string;
    timestamp: string;
}
```

## React Hooks

### useCallStateListener()

Listen to all call events for the authenticated user.

```tsx
import { useCallStateListener } from '@/hooks/useCallStateListener';

function MyComponent() {
    useCallStateListener({
        onStateChange: (data) => {
            console.log('Call state changed:', data);
            // Update your UI state here
        },
        onStatusChange: (data) => {
            console.log('Call status changed:', data);
            // Update your UI state here
        },
        showToasts: true, // Show toast notifications (default: true)
    });

    return <div>...</div>;
}
```

### useCallSessionListener()

Listen to events for a specific call session (useful for call detail pages).

```tsx
import { useCallSessionListener } from '@/hooks/useCallStateListener';

function CallDetailsPage({ sessionId }: { sessionId: string }) {
    useCallSessionListener(sessionId, {
        onStateChange: (data) => {
            console.log('Session state changed:', data);
            // Refresh call details
        },
        showToasts: false, // Don't show toasts for specific session
    });

    return <div>Call details for {sessionId}</div>;
}
```

## Integration Example: CallContextProvider

Here's how to integrate the hooks into your existing CallContextProvider:

```tsx
import { useCallStateListener, CallStateData, CallStatusData } from '@/hooks/useCallStateListener';

export function CallContextProvider({ children }: { children: ReactNode }) {
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);

    // Listen to call events for the authenticated user
    useCallStateListener({
        onStateChange: (data: CallStateData) => {
            // Update active call state based on broadcast event
            if (data.status === 'initiated' || data.status === 'ringing' || data.status === 'answered') {
                setActiveCall((prev) => ({
                    ...prev,
                    id: prev?.id || '',
                    session_id: data.session_id,
                    status: data.status,
                    caller_number: data.caller_number || '',
                    callee_number: data.callee_number || '',
                    // ... other fields
                }));
            } else if (data.status === 'ended' || data.status === 'failed') {
                // Clear active call when ended
                setActiveCall(null);
            }
        },
        onStatusChange: (data: CallStatusData) => {
            // Update call status
            setActiveCall((prev) =>
                prev?.session_id === data.session_id
                    ? { ...prev, status: data.status }
                    : prev
            );
        },
        showToasts: true, // Show toast notifications
    });

    // ... rest of your provider code

    return (
        <CallContext.Provider value={{ activeCall, /* ... */ }}>
            {children}
        </CallContext.Provider>
    );
}
```

## Laravel Channels Setup

Channels are defined in `routes/channels.php`:

```php
// User's private channel - receives all call events for the user
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Lead channel - receives call events associated with a lead
Broadcast::channel('lead.{id}', function ($user, $id) {
    return $user !== null; // Authenticated users can listen to lead updates
});

// Call session channel - receives updates for a specific call session
Broadcast::channel('call-session.{sessionId}', function ($user, $sessionId) {
    return $user !== null; // Authenticated users can listen to call sessions
});
```

## Testing

### 1. Test Call State Broadcast

Make a test call through the dialer:
```tsx
const { startCall } = useCallContext();
startCall({ callee_number: '1234567890' });
```

You should see:
1. Toast notification "Call initiated"
2. Console log: "Call state changed: { status: 'initiated', ... }"
3. UI updates reflecting the new call state

### 2. Test Real-time Updates

Open two browser tabs with the same user:
- Tab 1: Make a call
- Tab 2: Should receive real-time updates via broadcasts

### 3. Monitor Console

Enable Echo debugging in your browser console:
```javascript
window.Echo.connector.pusher.connection.bind('state_change', (states) => {
    console.log('Pusher connection state:', states);
});
```

## Troubleshooting

### Events not received?

1. **Check WebSocket connection:**
   ```javascript
   console.log('Echo connected:', window.Echo.connector.pusher.connection.state);
   ```

2. **Check channel subscription:**
   ```javascript
   window.Echo.connector.pusher.allChannels().forEach(channel => {
       console.log('Subscribed to:', channel.name);
   });
   ```

3. **Verify Laravel broadcast configuration:**
   ```bash
   php artisan config:cache
   ```

4. **Check queue workers are running (if using queue):**
   ```bash
   php artisan queue:work
   ```

5. **Enable Echo debugging:**
   ```javascript
   window.Echo.connector.pusher.logToConsole = true;
   ```

### TypeScript errors?

Make sure your types are imported correctly:
```tsx
import type { CallStateData, CallStatusData } from '@/hooks/useCallStateListener';
```

## Additional Resources

- Laravel Broadcasting Docs: https://laravel.com/docs/broadcasting
- Laravel Echo React: https://github.com/laravel/echo-react
- Pusher Protocol Docs: https://pusher.com/docs