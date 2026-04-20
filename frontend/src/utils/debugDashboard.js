import axios from 'axios';

const testDashboardData = async () => {
  const API_URL = 'http://localhost:5002/api';
  
  console.log('=== Dashboard Data Debug Test ===\n');
  
  // Step 1: Check localStorage
  const token = localStorage.getItem('token');
  console.log('1. Token from localStorage:', token ? 'Found' : 'Not found');
  if (token) {
    console.log('   Token length:', token.length);
    // Show first 50 chars of token
    console.log('   Token preview:', token.substring(0, 50) + '...');
  }
  
  // Step 2: Try to fetch projects
  console.log('\n2. Testing /api/projects endpoint...');
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    console.log('   Headers:', JSON.stringify(headers));
    
    const response = await axios.get(`${API_URL}/projects`, { headers });
    console.log('   ✅ API Response received');
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    console.log('   Data count:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('   First project:', response.data.data[0].name);
    } else {
      console.log('   ⚠️ No data in response');
    }
  } catch (error) {
    console.error('   ❌ API Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error data:', error.response.data);
    }
  }
  
  // Step 3: Check window location
  console.log('\n3. Environment Info:');
  console.log('   Current URL:', window.location.href);
  console.log('   API URL:', API_URL);
  console.log('   User Agent:', navigator.userAgent.substring(0, 50) + '...');
};

// Run test when page loads
if (typeof window !== 'undefined') {
  window.runDashboardTest = testDashboardData;
  console.log('Dashboard test loaded. Run with: window.runDashboardTest()');
}

export default testDashboardData;
