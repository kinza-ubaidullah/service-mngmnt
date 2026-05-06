async function testAssign() {
  try {
    console.log('--- 1. Logging in as Admin ---');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();
    console.log('Admin Token acquired.\n');

    console.log('--- 2. Fetching Technicians ---');
    const techRes = await fetch('http://localhost:5000/api/users/technicians', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { technicians } = await techRes.json();
    console.log(`Found ${technicians.length} technicians.`);
    if (technicians.length === 0) throw new Error('No technicians found! Run the seed script first.');
    const techId = technicians[0].id;
    console.log(`Will assign to: ${technicians[0].name} (ID: ${techId})\n`);

    console.log('--- 3. Fetching Leads ---');
    const leadRes = await fetch('http://localhost:5000/api/leads', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { leads } = await leadRes.json();
    if (leads.length === 0) throw new Error('No leads available to assign!');
    const leadId = leads[0].id;
    console.log(`Will assign Lead: ${leads[0].lead_id} (ID: ${leadId})\n`);

    console.log('--- 4. Assigning Lead ---');
    const assignRes = await fetch(`http://localhost:5000/api/leads/${leadId}/assign`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        technician_id: techId,
        visit_date: new Date().toISOString()
      })
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok) throw new Error(assignData.message);
    
    console.log('Success! Lead updated details:');
    console.log({
      status: assignData.lead.status,
      assigned_to: assignData.lead.assigned_to,
      assigned_at: assignData.lead.assigned_at,
      visit_date: assignData.lead.visit_date
    });

  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}
testAssign();
