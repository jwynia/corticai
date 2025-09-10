const { DuckDBStorageAdapter } = require('./lib/storage/adapters/DuckDBStorageAdapter.js');

async function test() {
  const storage = new DuckDBStorageAdapter({
    type: 'duckdb',
    database: ':memory:',
    poolSize: 3,
    debug: true
  });
  
  console.log('Before concurrent operations');
  
  await Promise.all([
    storage.set('c1', { id: 1, name: 'Concurrent 1' }),
    storage.set('c2', { id: 2, name: 'Concurrent 2' }),
    storage.set('c3', { id: 3, name: 'Concurrent 3' })
  ]);
  
  console.log('After concurrent operations');
  console.log('Size:', await storage.size());
  
  const keys = [];
  for await (const key of storage.keys()) {
    keys.push(key);
  }
  console.log('Keys:', keys);
  
  await storage.close();
}

test().catch(console.error);
