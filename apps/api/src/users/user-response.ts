/** Explicit public account projection: never spread a user document into an auth response. */
export function publicUser(user: any) {
    const value = user?.toObject?.() || user || {};
    const fields = ['_id', 'email', 'firstName', 'lastName', 'role', 'grade', 'parentId', 'isActive', 'phone', 'city', 'address', 'assignedSubjects', 'createdAt', 'updatedAt'];
    const result = Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
    if (value._id) result.id = String(value._id);
    return result;
}
