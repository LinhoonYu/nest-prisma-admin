export const userPermissions = {
  LIST: 'iam:user:list',
  CREATE: 'iam:user:create',
  READ: 'iam:user:read',
  UPDATE: 'iam:user:update',
  DELETE: 'iam:user:delete',
  ASSIGN_ROLES: 'iam:user:assign-roles',
  ASSIGN_SCOPE: 'iam:user:assign-scope',
  RESET_PWD: 'iam:user:reset-password',
} as const;
