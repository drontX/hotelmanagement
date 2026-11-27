import { Request, Response, NextFunction } from 'express';
import { Role, StaffRole } from '@hotel/shared';
import { errorResponse } from '../utils/helpers';

export function checkRole(...allowedRoles: Array<Role | string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Yêu cầu xác thực', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      errorResponse(res, 'Bạn không có quyền thực hiện thao tác này', 403);
      return;
    }

    next();
  };
}

export function checkStaffRole(...allowedStaffRoles: Array<StaffRole | string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Yêu cầu xác thực', 401);
      return;
    }

    const userStaffRole = req.user.staffRole;

    if (userStaffRole === StaffRole.OWNER) {
      next();
      return;
    }

    if (userStaffRole && allowedStaffRoles.includes(userStaffRole)) {
      next();
      return;
    }

    if (req.user.role === Role.ADMIN && !userStaffRole && allowedStaffRoles.length === 0) {
      next();
      return;
    }

    errorResponse(res, 'Vai trò nhân sự không có quyền truy cập chức năng này', 403);
  };
}
