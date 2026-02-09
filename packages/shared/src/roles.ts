export enum UserRole {
    STUDENT = 'STUDENT',
    PARENT = 'PARENT',
    TEACHER = 'TEACHER',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
    SUPPORT_AGENT = 'SUPPORT_AGENT',
}

export const ROLES = Object.values(UserRole);
