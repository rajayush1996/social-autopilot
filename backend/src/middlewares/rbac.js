import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/responseHandler.js';

/**
 * Middleware: Role-Based Access Control (RBAC)
 * Restricts endpoint consumption strictly to users with the 'ADMIN' role.
 * Can consume from active JWT auth session (req.user) or fallback to manual ID parameters.
 */
export const restrictToSuperAdmin = catchAsync(async (req, res, next) => {
  let role = req.user?.role;

  if (!role && req.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    role = user?.role;
  }

  if (!role || (role.toUpperCase() !== 'SUPER_ADMIN' && role.toUpperCase() !== 'ADMIN')) {
    throw ApiError.forbidden('Access Denied: Only Super Admin can perform this action.');
  }

  next();
});

export const restrictToAdmin = restrictToSuperAdmin;
