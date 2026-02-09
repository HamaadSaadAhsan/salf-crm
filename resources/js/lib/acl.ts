import { User } from '@/types/auth';

export class ACL {
    private user: User | null;
    private serverPermissions: string[];

    constructor(user: User | null = null, serverPermissions: string[] = []) {
        this.user = user;
        this.serverPermissions = serverPermissions;
    }

    /**
     * Check if user has a specific permission.
     * Uses server-computed permissions as the source of truth.
     * Falls back to client-side role/direct permission check if server permissions aren't available.
     */
    can(permission: string): boolean {
        if (!this.user) return false;

        // Server-computed permissions are the source of truth
        if (this.serverPermissions.length > 0) {
            return this.serverPermissions.includes(permission);
        }

        // Fallback: check role permissions then direct permissions
        const hasRolePermission = this.user?.roles?.some((role) => role.permissions.some((perm) => perm.name === permission)) || false;
        const hasDirectPermission = this.user.direct_permissions?.some((perm) => perm.name === permission) || false;

        return hasRolePermission || hasDirectPermission;
    }

    // Check if user has permission using resource and action
    canAction(action: string, resource: string): boolean {
        const permissionName = `${action} ${resource}`;
        return this.can(permissionName);
    }

    // Check if user has any of the specified permissions
    canAny(permissions: string[]): boolean {
        return permissions.some((permission) => this.can(permission));
    }

    // Check if user has all specified permissions
    canAll(permissions: string[]): boolean {
        return permissions.every((permission) => this.can(permission));
    }

    // Check if user has specific role
    hasRole(roleName: string): boolean {
        if (!this.user) return false;
        if (!this.user.roles) return false;

        return this.user.roles.some((role) => role.name === roleName);
    }

    // Check if user has any of the specified roles
    hasAnyRole(roleNames: string[]): boolean {
        return roleNames.some((roleName) => this.hasRole(roleName));
    }

    // Check if user has all specified roles
    hasAllRoles(roleNames: string[]): boolean {
        return roleNames.every((roleName) => this.hasRole(roleName));
    }

    // Get all user permissions (server-computed)
    getAllPermissions(): string[] {
        if (this.serverPermissions.length > 0) {
            return this.serverPermissions;
        }

        if (!this.user) return [];
        if (!this.user.roles) return [];

        const rolePermissions = this.user.roles.flatMap((role) => role.permissions.map((perm) => perm.name));
        const directPermissions = this.user.direct_permissions?.map((perm) => perm.name) || [];

        return [...new Set([...rolePermissions, ...directPermissions])];
    }

    // Get all user roles
    getRoles(): string[] {
        if (!this.user) return [];
        if (!this.user.roles) return [];
        return this.user.roles.map((role) => role.name);
    }

    // Check permission with Laravel-style gate logic
    allows(permission: string, resource?: any): boolean {
        if (!resource) {
            return this.can(permission);
        }
        return this.can(permission);
    }

    // Check if user is super admin (common Spatie pattern)
    isSuperAdmin(): boolean {
        return this.hasRole('super-admin') || this.hasRole('admin');
    }
}
