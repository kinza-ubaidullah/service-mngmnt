
const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    console.log('FULL RESPONSE DATA:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('ERROR:', error.response ? error.response.data : error.message);
  }
}

testLogin();
