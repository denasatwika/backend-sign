/**
 * Custom error classes for standardized error handling
 */

interface IAppError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  details?: any;
  resource?: string; 
  id?: string | number | null;
  field?: string | null;
  originalError?: any;
}

export class AppError extends Error implements IAppError {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  public details: any;

  constructor(message: string = 'Validation failed', details: any = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  public resource: string;
  public id: string | number | null;

  constructor(resource: string = 'Resource', id: string | number | null = null) {
    const message = id
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.id = id;
  }
}

export class ConflictError extends AppError {
  public field: string | null;

  constructor(message: string = 'Resource already exists', field: string | null = null) {
    super(message, 409, 'CONFLICT');
    this.field = field;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class DatabaseError extends AppError {
  public originalError: any;

  constructor(message: string = 'Database operation failed', originalError: any = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}