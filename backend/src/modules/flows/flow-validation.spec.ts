import { FlowExecutorService } from './flow-executor.service';

describe('FlowExecutorService (DAG Graph Validation & Topological Sorting)', () => {
  let service: FlowExecutorService;

  beforeEach(() => {
    service = new FlowExecutorService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('validateGraph', () => {
    it('should validate a correct linear DAG graph', () => {
      const graph = {
        nodes: [
          { id: 'start', type: 'start', config: {} },
          { id: 'nav', type: 'navigate', config: { url: 'https://example.com' } },
          { id: 'end', type: 'end', config: {} },
        ],
        edges: [
          { source: 'start', target: 'nav' },
          { source: 'nav', target: 'end' },
        ],
      };

      const result = service.validateGraph(graph as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report an error for missing nodes', () => {
      const result = service.validateGraph({ nodes: [], edges: [] } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Flow graph contains no nodes.');
    });

    it('should report an error for navigate node missing target url', () => {
      const graph = {
        nodes: [
          { id: 'nav-1', type: 'navigate', config: {} },
        ],
        edges: [],
      };

      const result = service.validateGraph(graph as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("requires a 'url' configuration");
    });

    it('should report an error for broken edge references', () => {
      const graph = {
        nodes: [
          { id: 'node-1', type: 'start', config: {} },
        ],
        edges: [
          { source: 'node-1', target: 'non-existent-node' },
        ],
      };

      const result = service.validateGraph(graph as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("references non-existent target node 'non-existent-node'");
    });
    it('should report an error for cyclic graphs', () => {
      const graph = {
        nodes: [
          { id: 'a', type: 'start', config: {} },
          { id: 'b', type: 'click', config: {} },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'a' },
        ],
      };

      const result = service.validateGraph(graph as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Flow graph contains a cycle.');
    });
  });

  describe('topologicalSort', () => {
    it('should sort nodes according to edge dependencies', () => {
      const graph = {
        nodes: [
          { id: 'c', type: 'end', config: {} },
          { id: 'a', type: 'start', config: {} },
          { id: 'b', type: 'click', config: {} },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'c' },
        ],
      };

      const sorted = service.topologicalSort(graph as any);
      expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('variable interpolation', () => {
    it('should replace {{variable}} mustache tags with scoped values', () => {
      const template = 'Hello, {{username}}! Your code is {{code}}.';
      const variables = { username: 'Alice', code: 42 };

      const result = service.interpolateVariables(template, variables);
      expect(result).toEqual('Hello, Alice! Your code is 42.');
    });

    it('should leave unknown variables intact', () => {
      const template = 'Value: {{unknown_variable}}';
      const result = service.interpolateVariables(template, {});
      expect(result).toEqual('Value: {{unknown_variable}}');
    });
  });

  describe('executeFlow branching and cancellation', () => {
    it('should skip the false branch when condition evaluates to true', async () => {
      const mockPage = { url: () => 'https://example.com', title: async () => 'Example' } as any;
      const actionExecutor = { execute: jest.fn().mockResolvedValue({ success: true }) } as any;
      const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as any;
      const pageManager = { captureViewportFrame: jest.fn().mockResolvedValue(null) } as any;

      const execService = new FlowExecutorService(
        actionExecutor,
        {} as any,
        {} as any,
        eventPublisher,
        pageManager,
      );

      const graph = {
        nodes: [
          { id: 'cond', type: 'condition', config: { left_operand: '10', operator: '>', right_operand: '5' } },
          { id: 'yes_node', type: 'click', config: { selector: '#yes' } },
          { id: 'no_node', type: 'click', config: { selector: '#no' } },
        ],
        edges: [
          { source: 'cond', target: 'yes_node', sourceHandle: 'true' },
          { source: 'cond', target: 'no_node', sourceHandle: 'false' },
        ],
      };

      const state: any = { executionId: 'exec-1', storageDir: '/tmp', variables: {}, cancelled: false, stepResults: [] };
      const outcome = await execService.executeFlow(mockPage, graph as any, state);

      expect(outcome.status).toBe('passed');
      expect(actionExecutor.execute).toHaveBeenCalledTimes(1);
      expect(state.stepResults.find((s: any) => s.nodeId === 'yes_node')?.status).toBe('passed');
      expect(state.stepResults.find((s: any) => s.nodeId === 'no_node')?.status).toBe('skipped');
    });

    it('should stop execution when isCancelled returns true', async () => {
      const execService = new FlowExecutorService({} as any, {} as any, {} as any, {} as any, {} as any);
      const graph = {
        nodes: [{ id: 'start', type: 'start', config: {} }],
        edges: [],
      };
      const state: any = {
        executionId: 'exec-2',
        storageDir: '/tmp',
        variables: {},
        cancelled: false,
        isCancelled: jest.fn().mockResolvedValue(true),
        stepResults: [],
      };

      const outcome = await execService.executeFlow({} as any, graph as any, state);
      expect(outcome.status).toBe('cancelled');
    });
  });
});
