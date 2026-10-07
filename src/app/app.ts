import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Confirmation, Toasts } from './shared/components/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts, Confirmation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {}
