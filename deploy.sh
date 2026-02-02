#!/bin/bash

# ============================================
# Release-Based Deployment Script
# ============================================
# This script creates atomic releases with automatic rollback
# Usage: ./deploy.sh [--rollback]
#
# Directory Structure:
#   /var/www/salf-crm/
#   ├── current -> releases/20260202120000 (symlink)
#   ├── releases/
#   │   ├── 20260202120000/
#   │   └── ...
#   └── shared/
#       ├── .env
#       ├── storage/
#       └── data.ms/
# ============================================

set -e

# ============================================
# Configuration
# ============================================
DEPLOY_PATH="/var/www/salf-crm"
RELEASES_PATH="$DEPLOY_PATH/releases"
SHARED_PATH="$DEPLOY_PATH/shared"
CURRENT_PATH="$DEPLOY_PATH/current"
RELEASES_TO_KEEP=3
BRANCH="main"
REPO_URL="git@github.com:HamaadSaadAhsan/salf-crm.git"

# Generate release ID
RELEASE_ID=$(date +%Y%m%d%H%M%S)
RELEASE_PATH="$RELEASES_PATH/$RELEASE_ID"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Helper Functions
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup_failed_release() {
    if [ -d "$RELEASE_PATH" ]; then
        log_warning "Cleaning up failed release: $RELEASE_ID"
        rm -rf "$RELEASE_PATH"
    fi
}

# Trap errors and cleanup
trap cleanup_failed_release ERR

# ============================================
# Setup PHP 8.4
# ============================================
setup_php() {
    log_info "Setting up PHP 8.4..."
    mkdir -p "$DEPLOY_PATH/bin"
    ln -sf $(which php8.4) "$DEPLOY_PATH/bin/php"
    export PATH="$DEPLOY_PATH/bin:$PATH"
    log_success "PHP $(php -v | head -n 1 | cut -d' ' -f2)"
}

# ============================================
# Rollback Function
# ============================================
rollback() {
    log_info "Initiating rollback..."

    cd "$RELEASES_PATH"
    RELEASES=($(ls -1d */ 2>/dev/null | sort -r))

    if [ ${#RELEASES[@]} -lt 2 ]; then
        log_error "No previous release to rollback to!"
        exit 1
    fi

    CURRENT_RELEASE=$(readlink -f "$CURRENT_PATH" | xargs basename)
    log_info "Current release: $CURRENT_RELEASE"

    # Find previous release
    PREVIOUS_RELEASE=""
    for release in "${RELEASES[@]}"; do
        release="${release%/}"
        if [ "$release" != "$CURRENT_RELEASE" ]; then
            PREVIOUS_RELEASE="$release"
            break
        fi
    done

    if [ -z "$PREVIOUS_RELEASE" ]; then
        log_error "No previous release found!"
        exit 1
    fi

    log_info "Rolling back to: $PREVIOUS_RELEASE"

    # Switch symlink
    ln -sfn "$RELEASES_PATH/$PREVIOUS_RELEASE" "$CURRENT_PATH"

    # Restart services
    cd "$CURRENT_PATH"
    setup_php
    php artisan horizon:terminate || true
    php artisan reverb:restart || true
    php artisan inertia:stop-ssr || true

    log_success "Rolled back to release: $PREVIOUS_RELEASE"
}

# ============================================
# Check for rollback flag
# ============================================
if [ "$1" == "--rollback" ]; then
    setup_php
    rollback
    exit 0
fi

# ============================================
# Main Deployment
# ============================================
echo ""
echo "================================================"
echo "  RELEASE DEPLOYMENT"
echo "================================================"
echo "  Release ID: $RELEASE_ID"
echo "  Deploy Path: $DEPLOY_PATH"
echo "================================================"
echo ""

setup_php

# ============================================
# Step 1: Create Release Directory
# ============================================
log_info "[1/9] Creating release directory..."
mkdir -p "$RELEASE_PATH"
log_success "Created: $RELEASE_PATH"

# ============================================
# Step 2: Clone Repository
# ============================================
log_info "[2/9] Cloning repository..."

# Add GitHub to known_hosts to avoid host key verification failure
mkdir -p ~/.ssh
ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts 2>/dev/null

git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$RELEASE_PATH"
cd "$RELEASE_PATH"
log_success "Cloned commit: $(git rev-parse --short HEAD)"

# ============================================
# Step 3: Link Shared Files
# ============================================
log_info "[3/9] Linking shared files..."

# Ensure shared directories exist
mkdir -p "$SHARED_PATH/storage/app/public"
mkdir -p "$SHARED_PATH/storage/framework/cache"
mkdir -p "$SHARED_PATH/storage/framework/sessions"
mkdir -p "$SHARED_PATH/storage/framework/views"
mkdir -p "$SHARED_PATH/storage/logs"

# Remove release storage and link to shared
rm -rf "$RELEASE_PATH/storage"
ln -s "$SHARED_PATH/storage" "$RELEASE_PATH/storage"

# Link .env file
if [ -f "$SHARED_PATH/.env" ]; then
    ln -s "$SHARED_PATH/.env" "$RELEASE_PATH/.env"
else
    log_error "No .env file found in shared directory!"
    exit 1
fi

# Link Meilisearch data if exists
if [ -d "$SHARED_PATH/data.ms" ]; then
    ln -s "$SHARED_PATH/data.ms" "$RELEASE_PATH/data.ms"
fi

log_success "Shared files linked"

# ============================================
# Step 4: Install PHP Dependencies
# ============================================
log_info "[4/9] Installing PHP dependencies..."
cd "$RELEASE_PATH"
php $(which composer) install --no-interaction --prefer-dist --optimize-autoloader --no-dev
log_success "Composer dependencies installed"

# ============================================
# Step 5: Install Node Dependencies & Build
# ============================================
log_info "[5/9] Installing Node dependencies and building assets..."
npm ci --silent
npm run build:ssr
log_success "Assets built"

# ============================================
# Step 6: Run Migrations
# ============================================
log_info "[6/9] Running database migrations..."
php artisan migrate --force
log_success "Migrations completed"

# ============================================
# Step 7: Optimize Application
# ============================================
log_info "[7/9] Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan storage:link
log_success "Application optimized"

# ============================================
# Step 8: Health Check
# ============================================
log_info "[8/9] Running health check..."

# Test artisan commands
if ! php artisan about --json > /dev/null 2>&1; then
    log_error "Health check failed: Artisan commands not working"
    exit 1
fi

# Test database connection
if ! php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    log_error "Health check failed: Database connection failed"
    exit 1
fi

log_success "Health check passed"

# ============================================
# Step 9: Activate Release
# ============================================
log_info "[9/9] Activating release..."

# Atomic symlink switch
ln -sfn "$RELEASE_PATH" "$CURRENT_PATH"

log_success "Release $RELEASE_ID is now active!"

# ============================================
# Post-Activation: Restart Services
# ============================================
log_info "Restarting services..."

cd "$CURRENT_PATH"

# Terminate Horizon (supervisor will restart)
php artisan horizon:terminate || true

# Restart Reverb
php artisan reverb:restart || true

# Stop Inertia SSR (supervisor will restart)
php artisan inertia:stop-ssr || true

log_success "Services restarted"

# ============================================
# Cleanup: Purge Old Releases
# ============================================
log_info "Purging old releases (keeping $RELEASES_TO_KEEP)..."

cd "$RELEASES_PATH"
RELEASES_COUNT=$(ls -1d */ 2>/dev/null | wc -l)

if [ "$RELEASES_COUNT" -gt "$RELEASES_TO_KEEP" ]; then
    ls -1d */ | head -n -$RELEASES_TO_KEEP | while read dir; do
        log_info "Removing old release: $dir"
        rm -rf "$RELEASES_PATH/$dir"
    done
    log_success "Old releases purged"
else
    log_info "No releases to purge ($RELEASES_COUNT <= $RELEASES_TO_KEEP)"
fi

# ============================================
# Done
# ============================================
echo ""
echo "================================================"
echo -e "  ${GREEN}DEPLOYMENT SUCCESSFUL${NC}"
echo "================================================"
echo "  Release: $RELEASE_ID"
echo "  Active: $CURRENT_PATH -> $RELEASE_PATH"
echo "================================================"
echo ""
echo "To rollback: ./deploy.sh --rollback"
echo ""
