const { KuzuStorageAdapter } = require('./app/dist/storage/adapters/KuzuStorageAdapter.js');

async function testGraphOperations() {
  const adapter = new KuzuStorageAdapter({
    database: '/tmp/test-kuzu-graph',
    autoCreate: true,
    debug: true
  });

  await adapter.initialize();

  console.log('\n=== Testing Graph Operations ===\n');

  // Create a simple graph
  await adapter.addNode({ id: 'A', type: 'Node', properties: {} });
  await adapter.addNode({ id: 'B', type: 'Node', properties: {} });
  await adapter.addNode({ id: 'C', type: 'Node', properties: {} });
  await adapter.addNode({ id: 'D', type: 'Node', properties: {} });

  await adapter.addEdge({ from: 'A', to: 'B', type: 'connects', properties: {} });
  await adapter.addEdge({ from: 'B', to: 'C', type: 'connects', properties: {} });
  await adapter.addEdge({ from: 'A', to: 'D', type: 'connects', properties: {} });
  await adapter.addEdge({ from: 'D', to: 'C', type: 'connects', properties: {} });

  console.log('\n--- Testing shortestPath ---');
  const path = await adapter.shortestPath('A', 'C');
  console.log('Shortest path from A to C:', JSON.stringify(path, null, 2));

  console.log('\n--- Testing findConnected ---');
  const connected = await adapter.findConnected('A', 2);
  console.log('Nodes connected to A within depth 2:', connected.map(n => n.id));

  console.log('\n--- Testing traverse ---');
  const traversal = await adapter.traverse({
    startNode: 'A',
    direction: 'outgoing',
    maxDepth: 2,
    edgeTypes: ['connects']
  });
  console.log('Paths from A (max depth 2):', traversal.length, 'paths found');
  traversal.forEach((p, i) => {
    console.log(`  Path ${i}: ${p.nodes.map(n => n.id).join(' -> ')}`);
  });

  await adapter.clear();
  await adapter.close();
}

testGraphOperations().catch(console.error);