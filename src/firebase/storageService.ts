import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './config';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Uploads media (images, videos, audio) directly to Firebase Storage with real-time percentage progress.
 */
export async function uploadMediaFile(
  file: File,
  folder: 'avatars' | 'posts' | 'audio' | 'chat_media',
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error(
      'Firebase Storage is not configured. Please enter your Firebase Storage Bucket in Firebase Setup.'
    );
  }

  // Sanitize filename & create unique storage path
  const ext = file.name.split('.').pop() || 'dat';
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const path = `${folder}/${userId}/${timestamp}_${randomStr}.${cleanExt}`;

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('Storage upload error:', error);
        reject(new Error(`Failed to upload file to Firebase Storage: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
