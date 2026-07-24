import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/responseHandler.js';

/**
 * Middleware: Role-Based Access Control (RBAC)
 * Restricts endpoint consumption strictly to users with the 'ADMIN' role.
 * Can consume from active JWT auth session (req.user) or fallback to manual ID parameters.
 */
export const restrictToAdmin = catchAsync(async (req, res, next) => {
  let role = req.user?.role;

  if (!role) {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      role = user?.role;
    }
  }

  if (!role || role.toUpperCase() !== 'ADMIN') {
    throw ApiError.forbidden('Access Denied: Only application owners or administrators can perform this action.');
  }

  next();
});
