import { Database, Connection } from 'kuzu';
import fs from 'fs';

async function testKuzuSyntax() {
  const dbPath = '/tmp/kuzu-syntax-test';

  // Clean up any existing database
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  try {
    const database = new Database(dbPath);
    const connection = new Connection(database);

    // Create schema
    await connection.query('CREATE NODE TABLE IF NOT EXISTS Entity(id STRING, type STRING, data STRING, PRIMARY KEY (id))');
    await connection.query('CREATE REL TABLE IF NOT EXISTS Relationship(FROM Entity TO Entity, type STRING, data STRING)');

    // Insert test data using MERGE for safety
    await connection.query("MERGE (a:Entity {id: 'A'}) SET a.type = 'Node', a.data = '{}'");
    await connection.query("MERGE (b:Entity {id: 'B'}) SET b.type = 'Node', b.data = '{}'");
    await connection.query("MERGE (c:Entity {id: 'C'}) SET c.type = 'Node', c.data = '{}'");

    // Create relationships using parameterized approach
    await connection.query("MATCH (a:Entity), (b:Entity) WHERE a.id = 'A' AND b.id = 'B' CREATE (a)-[:Relationship {type: 'connects', data: '{}'}]->(b)");
    await connection.query("MATCH (b:Entity), (c:Entity) WHERE b.id = 'B' AND c.id = 'C' CREATE (b)-[:Relationship {type: 'connects', data: '{}'}]->(c)");

    console.log('Schema and data created successfully');

    // Test various recursive query syntaxes
    const queries = [
      // Simple working query first
      "MATCH (a:Entity {id: 'A'})-[r:Relationship]->(b:Entity) RETURN a.id, b.id, r.type",

      // Test with 'end' keyword issue - try 'target'
      "MATCH (source:Entity {id: 'A'})-[r:Relationship]->(target:Entity) RETURN source.id, target.id",

      // Test with constructed IN clause (no array parameter)
      {
        statement: "MATCH (source:Entity {id: $nodeId})-[r:Relationship]->(target:Entity) WHERE r.type IN ('connects') RETURN source.id as sourceId, target.id as targetId",
        parameters: { nodeId: 'A' }
      },

      // Test just the filtering part
      "MATCH (source:Entity {id: 'A'})-[r:Relationship]->(target:Entity) WHERE r.type = 'connects' RETURN source.id, target.id",

      // Just check table existence
      "MATCH (n:Entity) RETURN n.id LIMIT 1",
    ];

    for (const [index, query] of queries.entries()) {
      try {
        if (typeof query === 'string') {
          console.log(`\nTesting query ${index + 1}: ${query}`);
          const result = await connection.query(query);
          console.log(`✅ Query ${index + 1} succeeded`);

          const rows = await result.getAll();
          console.log(`   Found ${rows.length} results`);
        } else {
          console.log(`\nTesting parameterized query ${index + 1}: ${query.statement}`);
          console.log(`   Parameters: ${JSON.stringify(query.parameters)}`);

          const preparedStatement = await connection.prepare(query.statement);
          if (!preparedStatement.isSuccess()) {
            throw new Error(`Failed to prepare statement: ${preparedStatement.getErrorMessage()}`);
          }

          const result = await connection.execute(preparedStatement, query.parameters);
          console.log(`✅ Query ${index + 1} succeeded`);

          const rows = await result.getAll();
          console.log(`   Found ${rows.length} results`);
        }
      } catch (error) {
        console.log(`❌ Query ${index + 1} failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
  }
}

testKuzuSyntax().catch(console.error);