// Simple MongoDB connection test script
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

console.log('Testing connection to MongoDB...');
console.log('URI (first 20 chars):', MONGODB_URI.substring(0, 20) + '...');

// Test different connection options
async function testConnection() {
  console.log('\nTEST 1: Basic connection');
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Basic connection successful');
    await client.close();
  } catch (err) {
    console.error('❌ Basic connection failed:', err.message);
  }

  console.log('\nTEST 2: With tlsInsecure=true');
  try {
    const client = new MongoClient(MONGODB_URI, {
      tls: true,
      tlsInsecure: true,
    });
    await client.connect();
    console.log('✅ tlsInsecure=true connection successful');
    await client.close();
  } catch (err) {
    console.error('❌ tlsInsecure=true connection failed:', err.message);
  }

  console.log('\nTEST 3: Explicitly disable TLS');
  try {
    // For some versions of MongoDB driver
    const client = new MongoClient(MONGODB_URI, {
      tls: false,
      ssl: false,
    });
    await client.connect();
    console.log('✅ Disabled TLS connection successful');
    await client.close();
  } catch (err) {
    console.error('❌ Disabled TLS connection failed:', err.message);
  }

  console.log('\nTEST 4: Try direct connection without SRV');
  try {
    // Try parsing SRV URI and making direct connection
    if (MONGODB_URI.includes('mongodb+srv')) {
      // This is a very crude way to transform srv to direct
      // Just for testing purposes
      const directUri = MONGODB_URI
        .replace('mongodb+srv://', 'mongodb://')
        .replace('?', '/?');
      
      console.log('Direct URI (first 20 chars):', directUri.substring(0, 20) + '...');
      
      const client = new MongoClient(directUri, {
        tls: true,
      });
      await client.connect();
      console.log('✅ Direct connection successful');
      await client.close();
    } else {
      console.log('⚠️ Not using SRV URI, skipping this test');
    }
  } catch (err) {
    console.error('❌ Direct connection failed:', err.message);
  }

  console.log('\nTEST 5: Try DNS lookup manually');
  try {
    const dns = require('dns');
    const url = new URL(MONGODB_URI);
    const hostname = url.hostname;
    
    console.log(`Checking DNS for: ${hostname}`);
    
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        console.error('❌ DNS lookup failed:', err.message);
      } else {
        console.log(`✅ DNS resolved to: ${address} (IPv${family})`);
      }
    });
  } catch (err) {
    console.error('❌ DNS test failed:', err.message);
  }
}

testConnection().catch(err => {
  console.error('Uncaught error:', err);
});
