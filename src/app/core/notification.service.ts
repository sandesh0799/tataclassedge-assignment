import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export type ToastKind = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private readonly toastr: ToastrService) {}

  push(text: string, kind: ToastKind = 'info'): void {
    switch (kind) {
      case 'success':
        this.toastr.success(text);
        break;
      case 'error':
        this.toastr.error(text);
        break;
      default:
        this.toastr.info(text);
    }
  }
}
