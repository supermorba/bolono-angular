import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Confirmation, Toasts } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts, Confirmation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toasts />
    <app-confirmation />
  `,
})
export class App {}
