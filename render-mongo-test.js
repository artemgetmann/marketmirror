// Minimal MongoDB connection test for Render Shell
const { MongoClient } = require('mongodb');

// Get URI from environment
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable not set');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB...');

// Try three different connection methods
async function testConnections() {
  // Test 1: Most permissive settings
  try {
    console.log('\nTEST 1: Most permissive settings');
    const client = new MongoClient(uri, {
      tls: true,
      tlsInsecure: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true
    });
    
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    console.log('✅ Connection successful!');
    console.log(`Found ${collections.length} collections`);
    
    await client.close();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
  
  // Test 2: Original connection
  try {
    console.log('\nTEST 2: Basic connection');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Basic connection successful');
    await client.close();
  } catch (err) {
    console.error('❌ Basic connection failed:', err.message);
  }
}

// Run tests
testConnections()
  .then(() => console.log('Tests completed'))
  .catch(err => console.error('Unhandled error:', err))
  .finally(() => console.log('Done testing MongoDB connection'));
