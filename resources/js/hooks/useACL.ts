import { ACL } from '@/lib/acl';
import { type SharedData } from '@/types';
import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

export function useACL() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user || null;
    const serverPermissions = auth?.permissions || [];

    const acl = useMemo(() => new ACL(user as any, serverPermissions), [user, serverPermissions]);

    return {
        can: acl.can.bind(acl),
        canAction: acl.canAction.bind(acl),
        canAny: acl.canAny.bind(acl),
        canAll: acl.canAll.bind(acl),
        hasRole: acl.hasRole.bind(acl),
        hasAnyRole: acl.hasAnyRole.bind(acl),
        hasAllRoles: acl.hasAllRoles.bind(acl),
        allows: acl.allows.bind(acl),
        isSuperAdmin: acl.isSuperAdmin.bind(acl),
        getAllPermissions: acl.getAllPermissions.bind(acl),
        getRoles: acl.getRoles.bind(acl),
        getPermissions: acl.getAllPermissions.bind(acl),
    };
}
