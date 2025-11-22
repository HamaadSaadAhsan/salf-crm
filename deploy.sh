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

echo ""
echo "🔧 Setting up PHP wrapper..."
# Create a temporary directory in PATH that contains a 'php' symlink to php8.4
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$SCRIPT_DIR/tmp-php-bin"
ln -sf $(which php8.4) "$SCRIPT_DIR/tmp-php-bin/php"
export PATH="$SCRIPT_DIR/tmp-php-bin:$PATH"
echo "PHP version in PATH: $(php -v | head -n 1)"
echo "✅ PHP wrapper configured"

# Fetch and pull latest changes
echo ""
echo "📥 Fetching latest changes from main..."
git fetch origin main
git reset --hard origin/main

# Install/update PHP dependencies
echo ""
echo "📦 Installing PHP dependencies..."
php $(which composer) install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Install/update Node dependencies
echo ""
echo "📦 Installing Node dependencies..."
npm ci

# Build frontend assets
echo ""
echo "🏗️  Building frontend assets..."
npm run build:ssr

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Clear application cache
echo "🧹 optimizing application..."
php artisan optimize

# Gracefully restart Laravel Horizon
echo "🔄 Gracefully restarting Laravel Horizon..."
php artisan horizon:terminate
echo "✅ Horizon terminated (supervisor will auto-restart)"

# Gracefully restart Laravel Reverb
echo "🔄 Gracefully restarting Laravel Reverb..."
php artisan reverb:restart
echo "✅ Reverb restarted"

# Gracefully stop Inertia SSR
echo "🔄 Gracefully stopping Inertia SSR..."
php artisan inertia:stop-ssr
echo "✅ Inertia SSR stopped (supervisor will auto-restart)"

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 775 storage bootstrap/cache

# Cleanup temporary files
echo ""
echo "🧹 Cleaning up temporary files..."
rm -rf "$SCRIPT_DIR/tmp-php-bin"
echo "✅ Cleanup completed"

echo ""
echo "✅ Deployment completed successfully!"
