import { Storage } from '@google-cloud/storage';

const projectId = process.env.GCP_PROJECT_ID || 'atikot-org-share-project';
const bucketName = `${projectId}-player-photos`;

// Initialize Google Cloud Storage client
// In GKE with Workload Identity, authentication happens automatically
export const storage = new Storage({
  projectId,
});

export const bucket = storage.bucket(bucketName);

/**
 * Upload a file to Google Cloud Storage
 * @param file - Multer file object
 * @param playerId - Player ID for organizing files
 * @returns Public URL of the uploaded file
 */
export async function uploadPlayerPhoto(file: Express.Multer.File, playerId?: number): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = playerId
    ? `player-${playerId}/${timestamp}-${sanitizedFilename}`
    : `temp/${timestamp}-${sanitizedFilename}`;

  const blob = bucket.file(filename);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
      metadata: {
        uploadedAt: new Date().toISOString(),
        playerId: playerId?.toString() || 'temp',
      },
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => {
      reject(error);
    });

    blobStream.on('finish', () => {
      // Make the file publicly accessible
      blob.makePublic().then(() => {
        // Return the public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
        resolve(publicUrl);
      }).catch(reject);
    });

    blobStream.end(file.buffer);
  });
}

/**
 * Delete a player photo from Google Cloud Storage
 * @param photoUrl - Full URL of the photo to delete
 */
export async function deletePlayerPhoto(photoUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    // Format: https://storage.googleapis.com/bucket-name/filename
    const urlParts = photoUrl.split(`/${bucketName}/`);
    if (urlParts.length !== 2) {
      throw new Error('Invalid photo URL format');
    }

    const filename = urlParts[1];
    await bucket.file(filename).delete();
  } catch (error) {
    console.error('Error deleting photo:', error);
    // Don't throw - allow the player to be deleted even if photo deletion fails
  }
}
