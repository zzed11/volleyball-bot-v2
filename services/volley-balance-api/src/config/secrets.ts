import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const secretCache = new Map<string, string>();

/**
 * Get a secret value from Google Cloud Secret Manager or environment variable
 * @param secretName Name of the secret (e.g., 'db-password')
 * @returns Secret value
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  // Local development: use environment variables
  if (process.env.NODE_ENV === 'development') {
    const envVarName = secretName.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envVarName];

    if (envValue) {
      secretCache.set(secretName, envValue);
      return envValue;
    }

    console.warn(`Warning: Secret ${secretName} not found in environment variables`);
    return '';
  }

  // Production: use Secret Manager
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable not set');
  }

  try {
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload?.data?.toString() || '';

    // Cache the secret
    secretCache.set(secretName, secretValue);

    return secretValue;
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    throw error;
  }
}
