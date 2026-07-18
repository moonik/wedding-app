import { Component, signal } from '@angular/core';
import { UploadComponent } from './upload/upload';

@Component({
  selector: 'app-root',
  imports: [UploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('wedding-upload');
}
