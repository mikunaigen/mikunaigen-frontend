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
  heroAcademicCap,
  heroAdjustmentsHorizontal,
  heroArchiveBox,
  heroArrowDownTray,
  heroArrowLeft,
  heroArrowRightOnRectangle,
  heroArrowsPointingOut,
  heroArrowTrendingDown,
  heroArrowTrendingUp,
  heroArrowUpTray,
  heroBanknotes,
  heroBeaker,
  heroBolt,
  heroBriefcase,
  heroCake,
  heroCalendar,
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
  heroMagnifyingGlassPlus,
  heroMinus,
  heroMoon,
  heroPaperAirplane,
  heroPencilSquare,
  heroPhoto,
  heroPlus,
  heroQueueList,
  heroShieldCheck,
  heroShoppingCart,
  heroSignal,
  heroSparkles,
  heroStar,
  heroSun,
  heroTrash,
  heroTruck,
  heroUsers,
  heroXCircle,
  heroXMark,
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
      heroAcademicCap,
      heroAdjustmentsHorizontal,
      heroArchiveBox,
      heroArrowDownTray,
      heroArrowLeft,
      heroArrowRightOnRectangle,
      heroArrowsPointingOut,
      heroArrowTrendingDown,
      heroArrowTrendingUp,
      heroArrowUpTray,
      heroBanknotes,
      heroBeaker,
      heroBolt,
      heroBriefcase,
      heroCake,
      heroCalendar,
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
      heroMagnifyingGlassPlus,
      heroMinus,
      heroMoon,
      heroPaperAirplane,
      heroPencilSquare,
      heroPhoto,
      heroPlus,
      heroQueueList,
      heroShieldCheck,
      heroShoppingCart,
      heroSignal,
      heroSparkles,
      heroStar,
      heroSun,
      heroTrash,
      heroTruck,
      heroUsers,
      heroXCircle,
      heroXMark,
    }),
  ],
};
