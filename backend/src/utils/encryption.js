import crypto from 'crypto';

// Ensure we always have a valid 32-byte key derived from the environment variable via SHA-256
const getEncryptionKey = () => {
  const rawKey = process.env.ENCRYPTION_SECRET_KEY || 'default_dev_encryption_secret_key_change_me';
  return crypto.createHash('sha256').update(rawKey).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard for GCM to prevent iv repetition attacks

/**
 * Encrypt plaintext using AES-256-GCM.
 * Outputs format: iv:authTag:ciphertext
 * 
 * @param {String} text 
 * @returns {String} Encrypted cipher string
 */
export function encrypt(text) {
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt cipher text using AES-256-GCM.
 * Safe fallback: returns original text if it's not encrypted (supports legacy data).
 * 
 * @param {String} encryptedText 
 * @returns {String} Decrypted plaintext
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';

  const parts = encryptedText.split(':');
  // Check if string follows the iv:authTag:ciphertext layout
  if (parts.length !== 3) {
    return encryptedText;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  // Validate hex lengths to prevent simple parsing errors
  if (ivHex.length !== 24 || authTagHex.length !== 32) {
    return encryptedText;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // Gracefully fallback to original text if decryption fails (e.g. unencrypted strings)
    return encryptedText;
  }
}
