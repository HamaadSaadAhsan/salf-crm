#!/usr/bin/php -q
<?php

/**
 * Asterisk AGI Script for Incoming Calls
 * Handles incoming call logic using PostgreSQL database
 *
 * Routing Logic:
 * 1. If lead exists and is assigned to a user with an extension AND user is available, route to that user
 * 2. Otherwise, route to default ring group extension '299'
 */

require '/var/lib/asterisk/agi-bin/phpagi.php';

// Initialize AGI
$agi = new AGI;

// Get caller information from AGI
$callerId = $agi->request['agi_callerid'];
$uniqueId = $agi->request['agi_uniqueid'];

// Maximum workload per CRO (from IntelligentAssignmentService)
define('MAX_CRO_WORKLOAD', 50);

// Default extension (ring group) when no CRO is available
define('DEFAULT_EXTENSION', '299');

// PostgreSQL connection parameters (matching server.js config)
$host = '127.0.0.1';
$port = '5432';
$database = 'salf-crm-api';
$username = 'postgres';
$password = 'Al123_45';

/**
 * Generate a UUID v4
 */
function generateUUID(): string
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xFFFF), mt_rand(0, 0xFFFF),
        mt_rand(0, 0xFFFF),
        mt_rand(0, 0x0FFF) | 0x4000,
        mt_rand(0, 0x3FFF) | 0x8000,
        mt_rand(0, 0xFFFF), mt_rand(0, 0xFFFF), mt_rand(0, 0xFFFF)
    );
}

/**
 * Insert a call log entry
 */
function insertCallLog($dbConnection, $callSessionId, $logLevel, $eventType, $message, $context = []): void
{
    $insertLogQuery = "
        INSERT INTO call_logs (
            call_session_id,
            log_level,
            event_type,
            message,
            context,
            source,
            logged_at,
            created_at,
            updated_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'agi',
            NOW(),
            NOW(),
            NOW()
        )
    ";

    pg_query_params($dbConnection, $insertLogQuery, [
        $callSessionId,
        $logLevel,
        $eventType,
        $message,
        json_encode($context),
    ]);
}

/**
 * Calculate recency penalty based on last_assignment_at
 * Matches the logic from IntelligentAssignmentService
 */
function calculateRecencyPenalty($lastAssignmentAt): float
{
    if (! $lastAssignmentAt) {
        return 0;
    }

    $lastAssignmentTime = strtotime($lastAssignmentAt);
    $minutesSinceAssignment = (time() - $lastAssignmentTime) / 60;

    if ($minutesSinceAssignment < 5) {
        return 30;
    }

    if ($minutesSinceAssignment < 15) {
        return 15;
    }

    if ($minutesSinceAssignment < 30) {
        return 5;
    }

    return 0;
}

/**
 * Calculate assignment score for weighted round-robin
 * Matches the logic from IntelligentAssignmentService::calculateAssignmentScore
 */
function calculateAssignmentScore($cro): float
{
    $baseScore = 100;

    // Workload penalty (0-40 points)
    $currentLeadCount = floatval($cro['current_lead_count'] ?? 0);
    $workloadPenalty = ($currentLeadCount / MAX_CRO_WORKLOAD) * 40;
    $baseScore -= $workloadPenalty;

    // Performance bonus (-20 to +20 points based on performance_weight)
    $performanceWeight = floatval($cro['performance_weight'] ?? 1.0);
    $performanceBonus = ($performanceWeight - 1.0) * 20;
    $baseScore += $performanceBonus;

    // Conversion bonus (0-20 points)
    $conversionRate = floatval($cro['conversion_rate'] ?? 0);
    $conversionBonus = min(20, $conversionRate);
    $baseScore += $conversionBonus;

    // Recency penalty (0-30 points)
    $recencyPenalty = calculateRecencyPenalty($cro['last_assignment_at']);
    $baseScore -= $recencyPenalty;

    return max(0, $baseScore);
}

/**
 * Find an available CRO using weighted round-robin algorithm
 * Criteria:
 * - availability = true
 * - has role 'cro', 'support-agent', or 'senior-support-agent'
 * - has a valid extension (not null)
 * - under MAX_CRO_WORKLOAD
 *
 * Returns the CRO with the highest assignment score
 */
function findAvailableCRO($dbConnection, $agi): ?array
{
    // Query all available CROs with their metrics
    $query = "
        SELECT
            u.id,
            u.name,
            u.extension,
            u.current_lead_count,
            u.performance_weight,
            u.conversion_rate,
            u.last_assignment_at
        FROM users u
        INNER JOIN model_has_roles mhr ON mhr.model_id = u.id
            AND mhr.model_type = 'App\\Models\\User'
        INNER JOIN roles r ON r.id = mhr.role_id
        WHERE u.availability = true
          AND u.extension IS NOT NULL
          AND u.extension != ''
          AND u.current_lead_count < $1
          AND r.name IN ('cro', 'support-agent', 'senior-support-agent')
    ";

    $result = pg_query_params($dbConnection, $query, [MAX_CRO_WORKLOAD]);

    if (! $result) {
        $agi->verbose('Error querying available CROs: '.pg_last_error($dbConnection), 1);

        return null;
    }

    $cros = [];
    while ($row = pg_fetch_assoc($result)) {
        $row['score'] = calculateAssignmentScore($row);
        $cros[] = $row;
        $agi->verbose("CRO candidate: {$row['name']} (ID: {$row['id']}, ext: {$row['extension']}, score: {$row['score']})", 1);
    }

    if (empty($cros)) {
        return null;
    }

    // Sort by score descending and return the highest
    usort($cros, function ($a, $b) {
        return $b['score'] <=> $a['score'];
    });

    $selectedCRO = $cros[0];
    $agi->verbose("Selected CRO by weighted round-robin: {$selectedCRO['name']} with score {$selectedCRO['score']}", 1);

    return $selectedCRO;
}

/**
 * Update CRO's last_assignment_at and increment counters for round-robin fairness
 */
function updateCROAssignmentMetrics($dbConnection, $userId): void
{
    $updateQuery = '
        UPDATE users
        SET last_assignment_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
    ';
    pg_query_params($dbConnection, $updateQuery, [$userId]);
}

/**
 * Get user (CRO) by ID with their extension and metrics
 */
function getUserById($dbConnection, $userId): ?array
{
    $query = '
        SELECT
            id,
            name,
            extension,
            availability,
            current_lead_count,
            performance_weight,
            conversion_rate,
            last_assignment_at
        FROM users
        WHERE id = $1
        LIMIT 1
    ';
    $result = pg_query_params($dbConnection, $query, [$userId]);

    if (! $result) {
        return null;
    }

    return pg_fetch_assoc($result) ?: null;
}

try {
    // Connect to PostgreSQL
    $connectionString = "host=$host port=$port dbname=$database user=$username password=$password";
    $dbConnection = pg_connect($connectionString);

    if (! $dbConnection) {
        $agi->verbose('Failed to connect to PostgreSQL database', 1);
        throw new Exception('Database connection failed');
    }

    $agi->verbose('Connected to PostgreSQL database', 1);

    // Normalize phone number for matching (remove non-numeric characters)
    $normalizedPhone = preg_replace('/[^0-9]/', '', $callerId);
    $last10Digits = substr($normalizedPhone, -10);

    $agi->verbose("Searching for lead with phone: $callerId (normalized: $last10Digits)", 1);

    // Search for existing lead by phone number
    $leadQuery = "
        SELECT
            id,
            name,
            phone,
            inquiry_status,
            assigned_to,
            lead_score
        FROM leads
        WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || $1
        AND deleted_at IS NULL
        LIMIT 1
    ";

    $leadResult = pg_query_params($dbConnection, $leadQuery, [$last10Digits]);

    if (! $leadResult) {
        $agi->verbose('Error querying leads: '.pg_last_error($dbConnection), 1);
        throw new Exception('Lead query failed');
    }

    $lead = pg_fetch_assoc($leadResult);
    $leadId = null;
    $customerName = 'New Caller';
    $assignedTo = null;

    if ($lead) {
        $leadId = $lead['id'];
        $customerName = $lead['name'] ?: 'Unnamed Lead';
        $assignedTo = $lead['assigned_to'];

        $agi->verbose("Found existing lead: ID=$leadId, Name=$customerName, Assigned=$assignedTo", 1);
    } else {
        $agi->verbose("No existing lead found for phone: $callerId - creating new lead", 1);

        // Generate dummy name with 3-digit random number
        $randomNum = str_pad(mt_rand(0, 999), 3, '0', STR_PAD_LEFT);
        $customerName = "Caller $randomNum";
        $newLeadId = generateUUID();

        // Create new lead in database
        $insertLeadQuery = "
            INSERT INTO leads (
                id,
                name,
                phone,
                inquiry_status,
                priority,
                lead_score,
                created_at,
                updated_at
            )
            VALUES (
                $1::uuid,
                $2,
                $3,
                'new',
                'medium',
                0,
                NOW(),
                NOW()
            )
            RETURNING id
        ";

        $insertLeadResult = pg_query_params($dbConnection, $insertLeadQuery, [
            $newLeadId,
            $customerName,
            $callerId,
        ]);

        if ($insertLeadResult) {
            $leadRow = pg_fetch_assoc($insertLeadResult);
            $leadId = $leadRow['id'];
            $agi->verbose("Created new lead: ID=$leadId, Name=$customerName, Phone=$callerId", 1);
        } else {
            $agi->verbose('Error creating new lead: '.pg_last_error($dbConnection), 1);
        }
    }

    // Determine CRO to route the call to
    $targetCRO = null;
    $targetExtension = DEFAULT_EXTENSION; // Default to ring group
    $routingDecision = 'ring_group';
    $routingReason = 'No assigned user or user not available, routing to ring group';
    // $routingScore = null; // COMMENTED OUT: No longer using weighted scoring

    // Step 1: If lead has an assigned user, try to route to them (if available)
    if ($assignedTo) {
        $assignedUser = getUserById($dbConnection, $assignedTo);

        if ($assignedUser && ! empty($assignedUser['extension']) && $assignedUser['availability']) {
            $targetCRO = $assignedUser;
            $targetExtension = $assignedUser['extension'];
            $routingDecision = 'assigned_user';
            $routingReason = "Lead is assigned to {$assignedUser['name']} (ID: {$assignedUser['id']})";

            $agi->verbose("Routing to assigned user: {$assignedUser['name']} at extension $targetExtension", 1);
        } else {
            if ($assignedUser && ! $assignedUser['availability']) {
                $agi->verbose("Assigned user {$assignedUser['name']} is not available, routing to ring group", 1);
            } else {
                $agi->verbose('Assigned user has no extension or not found, routing to ring group', 1);
            }
        }
    }

    // Step 2: If no assigned CRO found or assigned CRO has no extension, find available CRO via weighted round-robin
    // COMMENTED OUT: No need to find available CRO using weighted round-robin - route directly to ring group
    // if ($targetExtension === DEFAULT_EXTENSION) {
    //     $availableCRO = findAvailableCRO($dbConnection, $agi);
    //
    //     if ($availableCRO) {
    //         $targetCRO = $availableCRO;
    //         $targetExtension = $availableCRO['extension'];
    //         $routingDecision = 'weighted_round_robin';
    //         $routingReason = "Routed to available CRO {$availableCRO['name']} (ID: {$availableCRO['id']}) via weighted round-robin with score {$availableCRO['score']}";
    //         $routingScore = $availableCRO['score'];
    //
    //         // Update last_assignment_at for round-robin fairness
    //         updateCROAssignmentMetrics($dbConnection, $availableCRO['id']);
    //
    //         $agi->verbose("Routing to available CRO: {$availableCRO['name']} at extension $targetExtension (score: {$availableCRO['score']})", 1);
    //     } else {
    //         $agi->verbose("No available CRO found, routing to default ring group extension $targetExtension", 1);
    //     }
    // }

    // Route directly to ring group when no assigned CRO
    if ($targetExtension === DEFAULT_EXTENSION) {
        $agi->verbose("No assigned CRO, routing to default ring group extension $targetExtension", 1);
    }

    // Get the user ID for the target CRO (for call session record)
    $userId = $targetCRO ? $targetCRO['id'] : null;

    // Generate unique session ID
    $sessionId = generateUUID();
    $agi->verbose("Generated session ID: $sessionId", 1);

    // Generate call signature for this incoming call
    // Format: LEAD-{leadId}-USER-{userId}-{timestamp}-{random}
    $timestamp = date('Ymd-His');
    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));
    $callSignature = 'LEAD-'.($leadId ?: 'NONE').'-USER-'.($userId ?: 'NONE')."-{$timestamp}-{$random}";
    $agi->verbose("Generated call signature: $callSignature", 1);

    // Create call session in database
    // intended_for_user_id is ONLY the lead's assigned CRO (if exists)
    // Coverage calls are only tracked when an assigned lead's CRO doesn't pick up
    // For new leads (no assignment), this should be null
    $intendedForUserId = $assignedTo;

    $insertSessionQuery = "
        INSERT INTO call_sessions (
            session_id,
            uniqueid,
            caller_id,
            intended_for_user_id,
            call_direction,
            call_type,
            status,
            caller_number,
            callee_number,
            started_at,
            call_signature,
            lead_id,
            created_at,
            updated_at
        )
        VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            'inbound',
            'voice',
            'ringing',
            $5,
            $6,
            NOW(),
            $7,
            $8::uuid,
            NOW(),
            NOW()
        )
        RETURNING id
    ";

    $insertResult = pg_query_params($dbConnection, $insertSessionQuery, [
        $sessionId,
        $uniqueId,
        $userId,
        $intendedForUserId,
        $callerId,
        $targetExtension,
        $callSignature,
        $leadId,
    ]);

    if (! $insertResult) {
        $agi->verbose('Error creating call session: '.pg_last_error($dbConnection), 1);
        throw new Exception('Call session creation failed');
    }

    $sessionRow = pg_fetch_assoc($insertResult);
    $callSessionId = $sessionRow['id'];

    $agi->verbose("Created call session with ID: $callSessionId", 1);

    // Insert initial ringing log BEFORE any events are dispatched
    insertCallLog(
        $dbConnection,
        $callSessionId,
        'info',
        'ringing',
        "Incoming call from $callerId",
        [
            'caller_id' => $callerId,
            'extension' => $targetExtension,
            'lead_id' => $leadId,
            'lead_name' => $customerName,
            'call_signature' => $callSignature,
        ]
    );

    // Insert routing decision log BEFORE any events are dispatched
    insertCallLog(
        $dbConnection,
        $callSessionId,
        'info',
        'routing_decision',
        $routingReason,
        [
            'routing_decision' => $routingDecision,
            // 'routing_score' => $routingScore, // COMMENTED OUT: No longer using weighted scoring
            'target_extension' => $targetExtension,
            'target_cro_id' => $userId,
            'target_cro_name' => $targetCRO ? $targetCRO['name'] : null,
            // 'target_cro_workload' => $targetCRO ? ($targetCRO['current_lead_count'] ?? 0) : null, // COMMENTED OUT: No longer using weighted scoring
            // 'target_cro_performance_weight' => $targetCRO ? ($targetCRO['performance_weight'] ?? 1.0) : null, // COMMENTED OUT: No longer using weighted scoring
            // 'target_cro_conversion_rate' => $targetCRO ? ($targetCRO['conversion_rate'] ?? 0) : null, // COMMENTED OUT: No longer using weighted scoring
            'lead_id' => $leadId,
            'lead_assigned_to' => $assignedTo,
            'caller_number' => $callerId,
            // 'algorithm' => 'weighted_round_robin', // COMMENTED OUT: No longer using weighted scoring
        ]
    );

    $agi->verbose('Created call log entries for ringing and routing decision', 1);

    // Set recording path based on call signature (Laravel private storage)
    $callRec = "/var/www/salf-crm/storage/app/private/recordings/{$callSignature}";

    // Set AGI variables for Asterisk to use
    $agi->set_variable('SESSION_ID', $sessionId);
    $agi->set_variable('CALLERID(name)', $customerName);
    $agi->set_variable('CALLERID(num)', '00000000804');
    $agi->set_variable('CALLERID(number)', '00000000804');
    $agi->set_variable('CRO', $targetExtension);
    $agi->set_variable('CallRec', $callRec);

    $agi->verbose("Set AGI variables: SESSION_ID=$sessionId, CRO=$targetExtension, CallRec=$callRec", 1);

    // Update last activity for the lead if found
    if ($leadId) {
        $updateLeadQuery = '
            UPDATE leads
            SET last_activity_at = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid
        ';
        pg_query_params($dbConnection, $updateLeadQuery, [$leadId]);
        $agi->verbose('Updated lead last_activity_at timestamp', 1);
    }

    // Close database connection
    pg_close($dbConnection);
    $agi->verbose('Database connection closed', 1);

} catch (Exception $e) {
    $agi->verbose('Error in incoming call handler: '.$e->getMessage(), 1);

    // Set default caller ID and extension in case of error
    $agi->set_variable('CALLERID(name)', 'Unknown Caller');
    $agi->set_variable('CRO', DEFAULT_EXTENSION);
    $agi->set_variable('CALL_ERROR', $e->getMessage());

    // Close connection if still open
    if (isset($dbConnection) && $dbConnection) {
        pg_close($dbConnection);
    }
}

$agi->verbose('Incoming call handler completed', 1);
