import * as crypto from 'crypto';

export function computeDefinitionChecksum(definition: Record<string, any>): string {
  if (!definition) return '';
  const sortedJson = JSON.stringify(definition, Object.keys(definition).sort());
  return crypto.createHash('sha256').update(sortedJson, 'utf8').digest('hex');
}
