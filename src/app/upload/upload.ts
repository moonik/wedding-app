import { Component, OnInit } from '@angular/core';
import { DriveService } from '../drive.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
  imports: [CommonModule]
})
export class UploadComponent implements OnInit {
  
    uploadProgressText = '';
  isUploading = false;

  constructor(public driveService: DriveService) {}

  // Triggered when users select files (e.g., <input type="file" multiple (change)="onFilesSelected($event)">)
  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const fileArray = Array.from(input.files);
    const totalFiles = fileArray.length;
    
    this.isUploading = true;
    let completedCount = 0;
    
    const CONCURRENCY_LIMIT = 3; // Uploads 3 files at a time max
    const runningPool: Promise<void>[] = [];

    this.uploadProgressText = `Starting upload of ${totalFiles} photos...`;

    for (const file of fileArray) {
      // Create the upload task for this specific file
      const uploadTask = this.driveService.uploadFile(file)
        .then(() => {
          completedCount++;
          this.uploadProgressText = `Uploaded ${completedCount} of ${totalFiles} photos...`;
        })
        .catch((err) => {
          console.error(`Skipping file ${file.name} due to upload failure.`);
        })
        .finally(() => {
          // Remove itself from the active pool when done
          runningPool.splice(runningPool.indexOf(uploadTask), 1);
        });

      runningPool.push(uploadTask);

      // If our running pool hits the batch limit, wait for the fastest one to finish
      if (runningPool.length >= CONCURRENCY_LIMIT) {
        await Promise.race(runningPool);
      }
    }

    // Wait for any remaining lingering images in the pool to finish up
    await Promise.all(runningPool);

    this.isUploading = false;
    this.uploadProgressText = '';
    alert(`Successfully processed all ${totalFiles} photos! Check your Google Drive.`);
    input.value = ''; // Reset file input
  }

  ngOnInit() {
    this.driveService.initTokenClient();
  }

  onLogin() {
    this.driveService.requestToken();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.driveService.uploadFile(file);
    }
  }
}
