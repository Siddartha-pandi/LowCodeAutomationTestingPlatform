import { CryptoVaultService } from './crypto-vault.service';

describe('CryptoVaultService (AES-256-GCM Interoperability)', () => {
  let service: CryptoVaultService;
  const masterKey = 'test-master-encryption-key-32ch';

  beforeEach(() => {
    service = new CryptoVaultService({
      get: () => masterKey,
    } as any);
  });

  it('should encrypt and decrypt plaintext symmetrically', () => {
    const plaintext = 'SuperSecretEnterprisePassword123!@#';
    const ciphertext = service.encryptSecret(plaintext);

    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toEqual(plaintext);

    const decrypted = service.decryptSecret(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should generate URL-safe base64 ciphertext matching Python format', () => {
    const plaintext = 'api_key_live_998877665544';
    const ciphertext = service.encryptSecret(plaintext);

    // Python urlsafe_b64encode replaces + with - and / with _
    expect(ciphertext).not.toContain('+');
    expect(ciphertext).not.toContain('/');

    const decrypted = service.decryptSecret(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });
});
