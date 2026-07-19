import { Injectable, signal } from '@angular/core';

declare var google: any;

@Injectable({ providedIn: 'root' })
export class DriveService {
  private client: any;

  public accessToken = signal<string | null>(null);

  private readonly CLIENT_ID = '927541637587-g3p370bgk05376hrfvfmd0ra8d4agh0j.apps.googleusercontent.com';
  private readonly SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCUXxQj9Q7ndePcI06znp6W0BtAWr33heMhgQO_DrrG8i8hKNUrEo8x9YXZPmmb2PQoA/exec';

  initTokenClient() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.log('Google SDK not ready yet, retrying in 300ms...');
      setTimeout(() => this.initTokenClient(), 300);
      return;
    }

    this.client = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
      callback: (tokenResponse: any) => {
        this.accessToken.set(tokenResponse.access_token);
        console.log('Access token acquired securely.');
      },
    });
  }

  requestToken() {
    this.client.requestAccessToken();
  }

  uploadFile(file: File): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const token = this.accessToken();
      if (!token) return reject('No access token available');

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];

          const payload = {
            token: token,
            base64: base64Data,
            fileName: file.name,
            mimeType: file.type
          };

          console.log(`Streaming JSON payload for ${file.name}...`);

          await fetch(this.SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
          });

          console.log(`Upload pipeline triggered for: ${file.name}`);
          resolve();
        } catch (err) {
          console.error(`Failed uploading ${file.name}:`, err);
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
    });
  }
}