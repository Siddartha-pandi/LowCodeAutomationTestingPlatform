import { computeDefinitionChecksum } from './flow-checksum';

describe('computeDefinitionChecksum', () => {
  it('should compute deterministic SHA-256 for identical JSON definitions regardless of key order', () => {
    const def1 = {
      name: 'Login Flow',
      nodes: [{ id: '1', type: 'navigate' }],
      edges: [{ source: '1', target: '2' }],
    };

    const def2 = {
      edges: [{ source: '1', target: '2' }],
      name: 'Login Flow',
      nodes: [{ id: '1', type: 'navigate' }],
    };

    const hash1 = computeDefinitionChecksum(def1);
    const hash2 = computeDefinitionChecksum(def2);

    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it('should produce different checksums when content changes', () => {
    const def1 = { name: 'Flow A', steps: [] };
    const def2 = { name: 'Flow B', steps: [] };

    const hash1 = computeDefinitionChecksum(def1);
    const hash2 = computeDefinitionChecksum(def2);

    expect(hash1).not.toEqual(hash2);
  });
});
