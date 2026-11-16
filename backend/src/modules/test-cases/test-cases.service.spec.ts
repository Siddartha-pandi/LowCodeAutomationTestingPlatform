import { testCaseToGraphDefinition } from './test-cases.service';

describe('testCaseToGraphDefinition', () => {
  it('should convert sequential steps and assertions into an executable DAG graph', () => {
    const testCase = {
      setup_steps: [
        {
          id: 'setup-1',
          step_type: 'action',
          action: 'navigate',
          target: { url: 'https://example.com' },
        },
      ],
      steps: [
        {
          id: 'step-1',
          step_type: 'action',
          action: 'click',
          target: { selector: 'button#submit' },
        },
        {
          id: 'step-2',
          step_type: 'assertion',
          assertion: 'element_visible',
          target: { selector: '.success-alert' },
          expected: 'Welcome',
        },
      ],
      teardown_steps: [],
    };

    const graph = testCaseToGraphDefinition(testCase);

    expect(graph.nodes).toHaveLength(5); // start + setup-1 + step-1 + step-2 + end
    expect(graph.nodes[0].id).toEqual('node-start');
    expect(graph.nodes[1].id).toEqual('setup-1');
    expect(graph.nodes[1].config.url).toEqual('https://example.com');
    expect(graph.nodes[2].id).toEqual('step-1');
    expect(graph.nodes[3].id).toEqual('step-2');
    expect(graph.nodes[3].config.expected).toEqual('Welcome');
    expect(graph.nodes[4].id).toEqual('node-end');

    expect(graph.edges).toHaveLength(4);
    expect(graph.edges[0]).toEqual({ source: 'node-start', target: 'setup-1' });
    expect(graph.edges[1]).toEqual({ source: 'setup-1', target: 'step-1' });
    expect(graph.edges[2]).toEqual({ source: 'step-1', target: 'step-2' });
    expect(graph.edges[3]).toEqual({ source: 'step-2', target: 'node-end' });
  });

  it('should handle empty steps gracefully', () => {
    const testCase = {
      setup_steps: [],
      steps: [],
      teardown_steps: [],
    };

    const graph = testCaseToGraphDefinition(testCase);
    expect(graph.nodes).toHaveLength(2); // start + end
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({ source: 'node-start', target: 'node-end' });
  });
});
