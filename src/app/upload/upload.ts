import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DriveService } from '../drive.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
  imports: [CommonModule]
})
export class UploadComponent implements OnInit, OnDestroy {
  countdownText = '';
  private countdownInterval?: number;
  private readonly targetDate = new Date('2026-08-22T15:00:00');

  uploadProgressText = '';
  isUploading = false;

  // 2. Wstrzyknij public cdr: ChangeDetectorRef w konstruktorze
  constructor(public driveService: DriveService, public cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.driveService.initTokenClient();
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      window.clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private updateCountdown(): void {
    const now = new Date();
    const diff = this.targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      this.countdownText = 'Już trwa! 🎉';
      if (this.countdownInterval) {
        window.clearInterval(this.countdownInterval);
        this.countdownInterval = undefined;
      }
    } else {
      const seconds = Math.floor(diff / 1000);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      this.countdownText = `${days}d ${this.pad(hours)}g ${this.pad(minutes)}m ${this.pad(secs)}s`;
    }

    this.cdr.detectChanges();
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  onLogin() {
    this.driveService.requestToken();
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const fileArray = Array.from(input.files);
    const totalFiles = fileArray.length;
    
    this.isUploading = true;
    let completedCount = 0;
    
    const CONCURRENCY_LIMIT = 3; 
    const runningPool: Promise<void>[] = [];

    this.uploadProgressText = `Rozpoczynam wysyłanie ${totalFiles} zdjęć...`;

    for (const file of fileArray) {
      const uploadTask = this.driveService.uploadFile(file)
        .then(() => {
          completedCount++;
          this.uploadProgressText = `Wysłano ${completedCount} z ${totalFiles} zdjęć...`;
          this.cdr.detectChanges(); // Wymuszaj odświeżanie licznika zdjęć w trakcie
        })
        .catch((err) => {
          console.error(`Pominięto plik ${file.name} z powodu błędu.`, err);
        })
        .finally(() => {
          runningPool.splice(runningPool.indexOf(uploadTask), 1);
        });

      runningPool.push(uploadTask);

      if (runningPool.length >= CONCURRENCY_LIMIT) {
        await Promise.race(runningPool);
      }
    }

    await Promise.all(runningPool);

    // Koniec wysyłania: Zmieniamy flagi
    this.isUploading = false;
    this.uploadProgressText = '';
    input.value = ''; 

    // 3. KLUCZOWA POPRAWKA: Wymuś natychmiastowe przerysowanie HTML!
    this.cdr.detectChanges();

    // Pokazujemy powiadomienie dopiero gdy przycisk w HTML wizualnie już się zmienił
    setTimeout(() => {
      alert(`Sukces! Wszystkie zdjęcia (${totalFiles}) zostały zapisane w naszej ślubnej galerii Google Drive. Dziękujemy!`);
    }, 50);
  }

  scrollToPlan() {
    const element = document.getElementById('plan-dnia');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToMenu() {
    const element = document.getElementById('menu-weselne');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}