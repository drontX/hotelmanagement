import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';
import { errorResponse } from '../utils/helpers';

type ValidationSource = 'body' | 'query' | 'params';

export function validateZod(schema: ZodTypeAny, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const formattedErrors = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      errorResponse(
        res,
        formattedErrors[0]?.message || 'Dữ liệu đầu vào không hợp lệ',
        400,
        formattedErrors
      );
      return;
    }

    if (source === 'body') {
      req.body = parsed.data;
    } else if (source === 'query') {
      req.query = parsed.data;
    } else {
      req.params = parsed.data;
    }
    next();
  };
}
