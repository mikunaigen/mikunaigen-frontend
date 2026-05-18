import { ErrorHandler, Injectable } from '@angular/core';
import { FrontendErrorReporterService } from './frontend-error-reporter.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private reporter: FrontendErrorReporterService) {}

  handleError(error: unknown): void {
    const err = this.unwrap(error);
    const message = err.message || String(error);
    this.reporter.report({
      level: 'ERROR',
      source: 'angular',
      message,
      stack: err.stack,
    });
    console.error(error);
  }

  private unwrap(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    const maybe = error as { rejection?: unknown };
    if (maybe?.rejection instanceof Error) {
      return maybe.rejection;
    }
    return new Error(String(error));
  }
}
