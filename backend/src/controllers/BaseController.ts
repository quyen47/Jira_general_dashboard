import { Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Base controller class providing common response handling and error tracking
 * All controllers should extend this class
 */
export abstract class BaseController {
  /**
   * Send a successful response
   */
  protected handleSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json(data);
  }

  /**
   * Send a created response (201)
   */
  protected handleCreated<T>(res: Response, data: T): void {
    this.handleSuccess(res, data, 201);
  }

  /**
   * Handle errors with Sentry tracking and appropriate response
   */
  protected handleError(
    error: unknown,
    res: Response,
    context: string,
    statusCode: number = 500
  ): void {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        controller: this.constructor.name,
        context,
      },
    });

    // Log to console for development
    console.error(`[${this.constructor.name}] Error in ${context}:`, error);

    // Send error response
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(statusCode).json({
      error: message,
      context,
    });
  }

  /**
   * Handle validation errors (400)
   */
  protected handleValidationError(res: Response, message: string): void {
    res.status(400).json({
      error: message,
    });
  }

  /**
   * Handle not found errors (404)
   */
  protected handleNotFound(res: Response, resource: string): void {
    res.status(404).json({
      error: `${resource} not found`,
    });
  }

  /**
   * Handle unauthorized errors (401)
   */
  protected handleUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    res.status(401).json({
      error: message,
    });
  }

  /**
   * Handle forbidden errors (403)
   */
  protected handleForbidden(res: Response, message: string = 'Forbidden'): void {
    res.status(403).json({
      error: message,
    });
  }
}
