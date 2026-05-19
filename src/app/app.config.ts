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
  heroArchiveBox,
  heroArrowLeft,
  heroArrowRightOnRectangle,
  heroArrowTrendingDown,
  heroArrowTrendingUp,
  heroBanknotes,
  heroBeaker,
  heroCake,
  heroChartPie,
  heroCheckCircle,
  heroCircleStack,
  heroCog6Tooth,
  heroDocumentText,
  heroEnvelope,
  heroExclamationTriangle,
  heroEye,
  heroEyeSlash,
  heroFire,
  heroHandThumbUp,
  heroHome,
  heroInformationCircle,
  heroLockClosed,
  heroMagnifyingGlass,
  heroMoon,
  heroPencilSquare,
  heroPhoto,
  heroPlus,
  heroQueueList,
  heroShieldCheck,
  heroShoppingCart,
  heroSparkles,
  heroStar,
  heroSun,
  heroTrash,
  heroTruck,
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
      heroArchiveBox,
      heroArrowLeft,
      heroArrowRightOnRectangle,
      heroArrowTrendingDown,
      heroArrowTrendingUp,
      heroBanknotes,
      heroBeaker,
      heroCake,
      heroChartPie,
      heroCheckCircle,
      heroCircleStack,
      heroCog6Tooth,
      heroDocumentText,
      heroEnvelope,
      heroExclamationTriangle,
      heroEye,
      heroEyeSlash,
      heroFire,
      heroHandThumbUp,
      heroHome,
      heroInformationCircle,
      heroLockClosed,
      heroMagnifyingGlass,
      heroMoon,
      heroPencilSquare,
      heroPhoto,
      heroPlus,
      heroQueueList,
      heroShieldCheck,
      heroShoppingCart,
      heroSparkles,
      heroStar,
      heroSun,
      heroTrash,
      heroTruck,
      heroUsers,
      heroXCircle,
    }),
  ],
};
