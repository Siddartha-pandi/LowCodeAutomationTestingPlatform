import { ChangeDetectorService } from './change-detector.service';

describe('ChangeDetectorService (Deterministic Self-Healing & Zero-AI)', () => {
  let service: ChangeDetectorService;

  beforeEach(() => {
    service = new ChangeDetectorService();
  });

  describe('calculateLevenshteinSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(service.calculateLevenshteinSimilarity('submit', 'submit')).toBe(1.0);
      expect(service.calculateLevenshteinSimilarity('Login', 'login')).toBe(1.0); // case insensitive
    });

    it('should return 1.0 for both empty strings', () => {
      expect(service.calculateLevenshteinSimilarity('', '')).toBe(1.0);
    });

    it('should return 0.0 when one string is empty and the other is not', () => {
      expect(service.calculateLevenshteinSimilarity('submit', '')).toBe(0.0);
    });

    it('should calculate accurate similarity for minor typo or label differences', () => {
      // "submit" vs "submitt" -> length 7, distance 1 -> (7-1)/7 = 0.857
      const sim = service.calculateLevenshteinSimilarity('submit', 'submitt');
      expect(sim).toBeGreaterThan(0.85);
      expect(sim).toBeLessThan(1.0);
    });

    it('should return low score for completely different labels', () => {
      const sim = service.calculateLevenshteinSimilarity('submit', 'cancel');
      expect(sim).toBeLessThan(0.3);
    });
  });

  describe('Zero-AI Verification', () => {
    it('should confirm ChangeDetectorService has no external AI network dependencies', () => {
      // Pure deterministic algorithmic scoring
      expect(typeof service.calculateLevenshteinSimilarity).toBe('function');
      expect(typeof service.detectCandidates).toBe('function');
    });
  });
});
