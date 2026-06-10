async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  const tests = [
    { label: 'duplicate phone abc', body: {
      customer_name: 'abc', customer_phone: '000000000', customer_area: 'makkah',
      product_type: 'Washing Machine', problem_details: 'test2', house_image: '', item_pictures: [],
      payment_confirmed: false, agreed_amount: '', lat: null, lng: null, google_map_link: ''
    }},
    { label: 'payment confirmed empty amount', body: {
      customer_name: 'pay test', customer_phone: '000000097', customer_area: 'makkah',
      product_type: 'Washing Machine', payment_confirmed: true, agreed_amount: ''
    }},
    { label: 'realistic large image', body: {
      customer_name: 'img test', customer_phone: '000000096', customer_area: 'makkah',
      product_type: 'Fridge', house_image: 'data:image/jpeg;base64,' + 'X'.repeat(500000),
      item_pictures: ['data:image/jpeg;base64,' + 'Y'.repeat(300000)]
    }},
  ];

  for (const t of tests) {
    const res = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(t.body)
    });
    const data = await res.json();
    console.log(t.label, '->', res.status, data.message || 'OK');
  }
}
test();
