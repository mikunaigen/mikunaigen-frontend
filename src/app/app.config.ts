import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ThemeService } from './services/theme.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { backendAwakeInterceptor } from './interceptors/backend-awake.interceptor';
import { frontendErrorInterceptor } from './interceptors/frontend-error.interceptor';
import { maintenanceInterceptor } from './interceptors/maintenance.interceptor';
import { GlobalErrorHandlerService } from './services/global-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import {
  heroArrowLeft,
  heroArrowRightOnRectangle,
  heroArrowTrendingDown,
  heroArrowTrendingUp,
  heroBeaker,
  heroChartPie,
  heroCheckCircle,
  heroCircleStack,
  heroCog6Tooth,
  heroDocumentText,
  heroEnvelope,
  heroExclamationTriangle,
  heroEye,
  heroEyeSlash,
  heroHome,
  heroMagnifyingGlass,
  heroMoon,
  heroPencilSquare,
  heroPlus,
  heroShieldCheck,
  heroSparkles,
  heroSun,
  heroTrash,
  heroUsers,
  heroXCircle,
} from '@ng-icons/heroicons/outline';

function initThemeFactory(theme: ThemeService) {
  return () => {
    theme.initSync();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        maintenanceInterceptor,
        backendAwakeInterceptor,
        frontendErrorInterceptor,
        authInterceptor,
      ]),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    {
      provide: APP_INITIALIZER,
      useFactory: initThemeFactory,
      deps: [ThemeService],
      multi: true,
    },
    provideIcons({
      heroArrowLeft,
      heroArrowTrendingDown,
      heroArrowTrendingUp,
      heroHome,
      heroUsers,
      heroShieldCheck,
      heroChartPie,
      heroBeaker,
      heroCircleStack,
      heroCog6Tooth,
      heroSparkles,
      heroDocumentText,
      heroEnvelope,
      heroCheckCircle,
      heroXCircle,
      heroExclamationTriangle,
      heroEye,
      heroEyeSlash,
      heroMagnifyingGlass,
      heroTrash,
      heroPencilSquare,
      heroPlus,
      heroMoon,
      heroSun,
      heroArrowRightOnRectangle,
    }),
  ],
};
