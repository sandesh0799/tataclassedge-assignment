import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] ?? []) as string[];

  if (!allowedRoles.length || allowedRoles.includes(auth.role())) return true;
  return router.createUrlTree(['/dashboard']);
};
