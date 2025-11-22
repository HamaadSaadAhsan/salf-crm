#!/bin/bash

# Laravel Deployment Script
# This script should be placed on your server

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Show current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"

# Fetch and pull latest changes
echo "📥 Fetching latest changes from main..."
git fetch origin main
git reset --hard origin/main

# Install/update PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Install/update Node dependencies
echo "📦 Installing Node dependencies..."
npm ci

# Build frontend assets
echo "🏗️  Building frontend assets..."
# Create temporary php wrapper for php8.4
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$SCRIPT_DIR/tmp-php-bin"
ln -sf $(which php8.4) "$SCRIPT_DIR/tmp-php-bin/php"
export PATH="$SCRIPT_DIR/tmp-php-bin:$PATH"
echo "PHP version in PATH: $(php -v | head -n 1)"
npm run build
rm -rf "$SCRIPT_DIR/tmp-php-bin"

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Clear application cache
echo "🧹 Clearing application cache..."
php artisan optimize:clear

# Cache configuration, routes, and views
echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart Laravel Horizon
echo "🔄 Restarting Laravel Horizon..."
supervisorctl restart laravel-horizon

# Restart Laravel Reverb
echo "🔄 Restarting Laravel Reverb..."
supervisorctl restart laravel-reverb

# Restart Inertia SSR
echo "🔄 Restarting Inertia SSR..."
supervisorctl restart laravel-inertia-ssr

# Check daemon status
echo "📊 Checking daemon status..."
supervisorctl status laravel-horizon laravel-reverb laravel-inertia-ssr

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 775 storage bootstrap/cache

echo "✅ Deployment completed successfully!"