async function test() {
  try {
    console.log('--- 1. Logging in to get token ---');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.message);
    
    const token = loginData.token;
    console.log('Login successful!\n');

    console.log('--- 2. Creating a new Lead ---');
    const createRes = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name: 'Imran Khan',
        customer_phone: '03001234567',
        customer_area: 'Gulberg',
        exact_address: 'Main Boulevard, House 12',
        product_type: 'AC',
        problem_details: 'Cooling issue, gas leakage suspected'
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.message);
    
    console.log('Lead created successfully:');
    console.log(createData.lead);
    console.log('\n');

    console.log('--- 3. Fetching all Leads ---');
    const fetchRes = await fetch('http://localhost:5000/api/leads', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fetchData = await fetchRes.json();
    if (!fetchRes.ok) throw new Error(fetchData.message);
    
    console.log(`Fetched ${fetchData.leads.length} total leads. Latest lead details:`);
    console.log(fetchData.leads[0]);

  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

test();
