import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Save, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type MatrixRole, type Permission } from './index';

interface PermissionMatrixProps {
    roles: MatrixRole[];
    permissions: Permission[];
}

export function PermissionMatrix({ roles, permissions }: PermissionMatrixProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Local state for the matrix: { [roleId]: Set<permissionId> }
    const [matrix, setMatrix] = useState<Record<number, Set<number>>>(() => {
        const initial: Record<number, Set<number>> = {};
        roles.forEach((role) => {
            initial[role.id] = new Set(role.permissions);
        });
        return initial;
    });

    /** Group permissions by category (part before the underscore) */
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, Permission[]> = {};
        permissions.forEach((p) => {
            const parts = p.name.split('_');
            const category = parts.length > 1 ? parts.slice(1).join('_') : 'general';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(p);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [permissions]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groupedPermissions;
        const query = searchQuery.toLowerCase();
        return groupedPermissions
            .map(([category, perms]) => {
                const filtered = perms.filter((p) => p.name.toLowerCase().includes(query));
                return [category, filtered] as [string, Permission[]];
            })
            .filter(([, perms]) => perms.length > 0);
    }, [groupedPermissions, searchQuery]);

    const handleToggle = (roleId: number, permissionId: number) => {
        setMatrix((prev) => {
            const rolePerms = new Set(prev[roleId]);
            if (rolePerms.has(permissionId)) {
                rolePerms.delete(permissionId);
            } else {
                rolePerms.add(permissionId);
            }
            return { ...prev, [roleId]: rolePerms };
        });
    };

    const handleSave = () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const rolePermissions = roles.map((role) => ({
            role_id: role.id,
            permission_ids: Array.from(matrix[role.id] || []),
        }));

        router.post(
            '/api/permissions/bulk-update',
            { role_permissions: rolePermissions },
            {
                onSuccess: () => {
                    setSuccess('Permissions updated successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                },
                onError: (errors: Record<string, string>) => {
                    setError(errors?.message || 'Failed to update permissions.');
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    return (
        <Card className="border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Permission Matrix</CardTitle>
                <div className="flex items-center gap-3">
                    <div className="relative max-w-sm">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search permissions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                        <Save className="size-4" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {success && (
                    <div className="px-6 pb-3">
                        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
                        </Alert>
                    </div>
                )}

                {error && (
                    <div className="px-6 pb-3">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-y bg-muted/50">
                                <th className="sticky left-0 z-10 min-w-[200px] bg-muted/50 px-4 py-3 text-left font-medium">Permission</th>
                                {roles.map((role) => (
                                    <th key={role.id} className="min-w-[120px] px-4 py-3 text-center font-medium">
                                        <Badge variant="outline" className="capitalize">
                                            {role.name}
                                        </Badge>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.map(([category, perms]) => (
                                <CategoryGroup
                                    key={category}
                                    category={category}
                                    permissions={perms}
                                    roles={roles}
                                    matrix={matrix}
                                    onToggle={handleToggle}
                                    isLoading={isLoading}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>

            <CardFooter className="justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                    {permissions.length} permissions across {roles.length} roles
                </p>
                <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                    <Save className="size-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>
        </Card>
    );
}

interface CategoryGroupProps {
    category: string;
    permissions: Permission[];
    roles: MatrixRole[];
    matrix: Record<number, Set<number>>;
    onToggle: (roleId: number, permissionId: number) => void;
    isLoading: boolean;
}

function CategoryGroup({     category, permissions, roles, matrix, onToggle, isLoading }: CategoryGroupProps) {
    return (
        <>
            <tr className="bg-muted/30">
                <td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {category.replace(/[_-]/g, ' ')}
                </td>
            </tr>
            {permissions.map((permission) => (
                <tr key={permission.id} className="border-b transition-colors hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2.5 font-mono text-xs">{permission.name}</td>
                    {roles.map((role) => (
                        <td key={role.id} className="px-4 py-2.5 text-center">
                            <Checkbox
                                checked={matrix[role.id]?.has(permission.id) ?? false}
                                onCheckedChange={() => onToggle(role.id, permission.id)}
                                disabled={isLoading}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
