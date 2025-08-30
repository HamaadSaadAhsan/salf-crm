import { ACL } from '@/lib/acl';
import { useMemo } from 'react';
import {User} from "@/types/auth";
import { useAuth } from './auth';

export function useACL() {
    const { user }: {user: User} = useAuth({middleware: 'auth'});
    const acl = useMemo(() => new ACL(user), [user]);

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
        getPermissions: acl.getAllPermissions.bind(acl)
    };
}
