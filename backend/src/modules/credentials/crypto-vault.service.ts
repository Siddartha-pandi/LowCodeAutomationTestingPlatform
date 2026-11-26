import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoVaultService {
  constructor(private readonly configService: ConfigService) {}

  private getEncryptionKey(): Buffer {
    const rawKey =
      this.configService.get<string>('app.appEncryptionKey') ||
      this.configService.get<string>('app.jwtSecret');
    if (!rawKey) {
      throw new Error('Encryption key is not configured (APP_ENCRYPTION_KEY / CREDENTIALS_MASTER_KEY)');
    }
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
  }

  encryptSecret(plainText: string): string {
    if (!plainText) return '';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit nonce for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag(); // 16 bytes auth tag

    // Layout: 12 bytes IV + encrypted text + 16 bytes tag
    const combined = Buffer.concat([iv, encrypted, tag]);
    return combined.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  decryptSecret(encryptedText: string): string {
    if (!encryptedText) return '';
    const key = this.getEncryptionKey();

    // Standardize URL-safe base64
    let b64 = encryptedText.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }

    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 28) {
      // 12 (IV) + 16 (Tag) = 28 minimum
      throw new Error('Malformed ciphertext: payload too short for AES-GCM tag and nonce');
    }

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const ciphertext = buf.subarray(12, buf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
