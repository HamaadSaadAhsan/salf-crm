<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Task reminder notifications channel
Broadcast::channel('users.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Lead assignment notifications channel
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Lead updates channel
Broadcast::channel('lead.{id}', function ($user, $id) {
    // Allow authenticated users to listen to lead updates
    return $user !== null;
});

// Global leads channel
Broadcast::channel('leads', function ($user) {
    // Allow authenticated users to listen to leads updates
    return $user !== null;
});

// Inbound calls channel
Broadcast::channel('inbound-calls', function ($user) {
    // Allow authenticated users to listen to inbound call events
    return $user !== null;
});

// Outbound calls channel
Broadcast::channel('outbound-calls', function ($user) {
    // Allow authenticated users to listen to outbound call events
    return $user !== null;
});

// Call session channel - allows listening to specific call session updates
Broadcast::channel('call-session.{sessionId}', function ($user, $sessionId) {
    // Allow authenticated users to listen to call session events
    return $user !== null;
});
