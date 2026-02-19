const axios = require('axios');

// Simple test to verify rate limiting
async function testRateLimit() {
  const sessionId = `test_${Date.now()}`;  // Generate unique session ID for this test
  const endpoint = 'http://localhost:3000/analyze';
  
  console.log('🧪 Testing rate limit (max: 1 analysis per day)');
  console.log(`Session ID: ${sessionId}`);
  console.log('=========================================');
  
  try {
    // First request - should succeed
    console.log('📊 FIRST REQUEST (should succeed):');
    const firstResponse = await axios.post(endpoint, {
      ticker: 'AAPL',
      sessionId: sessionId
    });
    
    console.log(`✅ Success! Status: ${firstResponse.status}`);
    console.log(`Usage info: ${JSON.stringify(firstResponse.data.usageInfo, null, 2)}`);
    console.log('=========================================');
    
    // Second request - should hit rate limit
    console.log('📊 SECOND REQUEST (should hit rate limit):');
    try {
      const secondResponse = await axios.post(endpoint, {
        ticker: 'MSFT',
        sessionId: sessionId
      });
      console.log('❌ TEST FAILED: Second request succeeded when it should have been rate-limited');
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('✅ Rate limit correctly applied! Status: 429');
        console.log(`Error message: ${error.response.data.error}`);
        console.log(`Reset in: ${error.response.data.resetInSeconds} seconds`);
      } else {
        console.log('❌ TEST FAILED: Unexpected error:');
        console.error(error.message);
      }
    }
    
    // Test the email subscription endpoint
    console.log('=========================================');
    console.log('📧 Testing email subscription:');
    const subscribeResponse = await axios.post('http://localhost:3000/subscribe', {
      email: 'test@example.com',
      sessionId: sessionId,
      source: 'rate-limit-test'
    });
    console.log(`✅ Subscription response: ${JSON.stringify(subscribeResponse.data, null, 2)}`);
    
  } catch (error) {
    console.log('❌ Test failed with unexpected error:');
    console.error(error.message);
  }
}

testRateLimit();
