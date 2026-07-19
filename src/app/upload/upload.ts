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
  private petalInterval?: number;
  private confettiTimeout?: number;
  private readonly targetDate = new Date('2026-08-22T15:00:00');

  uploadProgressText = '';
  isUploading = false;
  showConfetti = false;

  // 2. Wstrzyknij public cdr: ChangeDetectorRef w konstruktorze
  constructor(public driveService: DriveService, public cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.driveService.initTokenClient();
    this.startCountdown();
    this.startPetals();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      window.clearInterval(this.countdownInterval);
    }
    if (this.petalInterval) {
      window.clearInterval(this.petalInterval);
    }
    if (this.confettiTimeout) {
      window.clearTimeout(this.confettiTimeout);
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

  private startPetals(): void {
    this.petalInterval = window.setInterval(() => {
      this.createPetal();
    }, 700);
  }

  private createPetal(): void {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const petal = document.createElement('span');
    petal.className = 'petal';

    const size = 14 + Math.random() * 18;
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 6;
    const delay = Math.random() * 1.5;
    const rotation = Math.random() * 360;

    petal.style.left = `${left}%`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 0.6}px`;
    petal.style.opacity = `${0.55 + Math.random() * 0.35}`;
    petal.style.transform = `rotate(${rotation}deg)`;
    petal.style.animationDuration = `${duration}s`;
    petal.style.animationDelay = `${delay}s`;
    petal.style.background = Math.random() > 0.5
      ? 'radial-gradient(circle at 30% 30%, rgba(255, 192, 203, 0.95), rgba(216, 112, 147, 0.85))'
      : 'radial-gradient(circle at 35% 35%, rgba(255, 228, 225, 0.95), rgba(210, 105, 130, 0.8))';

    container.appendChild(petal);

    window.setTimeout(() => {
      petal.remove();
    }, (duration + delay) * 1000 + 500);
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

    // Pokazujemy efekt konfetti, a powiadomienie po jego zakończeniu
    this.triggerConfetti(() => {
      alert(`Sukces! Wszystkie zdjęcia (${totalFiles}) zostały zapisane w naszej ślubnej galerii Google Drive. Dziękujemy!`);
    });
  }

  private triggerConfetti(callback?: () => void): void {
    this.showConfetti = true;
    this.cdr.detectChanges();

    if (this.confettiTimeout) {
      window.clearTimeout(this.confettiTimeout);
    }

    this.confettiTimeout = window.setTimeout(() => {
      this.showConfetti = false;
      this.cdr.detectChanges();
      this.confettiTimeout = undefined;
      if (callback) {
        callback();
      }
    }, 2400);
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