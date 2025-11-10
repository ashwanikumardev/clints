const axios = require('axios');

async function testBackend() {
  const baseURL = 'http://localhost:5000';
  
  console.log('🧪 Testing Backend API...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  try {
    // Test login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'demo@example.com',
      password: 'any_password'
    });
    console.log('✅ Login test:', loginResponse.data);
  } catch (error) {
    console.error('❌ Login test failed:', error.response?.data || error.message);
  }
  
  try {
    // Test register endpoint
    console.log('\n3. Testing register endpoint...');
    const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('✅ Register test:', registerResponse.data);
  } catch (error) {
    console.error('❌ Register test failed:', error.response?.data || error.message);
  }
}

testBackend();
