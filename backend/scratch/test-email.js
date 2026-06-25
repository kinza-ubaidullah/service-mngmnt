const { Resend } = require('resend');
require('dotenv').config();

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM || 'Al Jaroshi CRM <onboarding@resend.dev>';

console.log('Using API Key:', apiKey ? 'FOUND (starts with ' + apiKey.substring(0, 7) + ')' : 'MISSING');
console.log('Using From Email:', fromEmail);

if (!apiKey) {
  console.error('Error: RESEND_API_KEY is not defined in .env');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function testEmail() {
  try {
    console.log('Sending test email...');
    const data = await resend.emails.send({
      from: fromEmail,
      to: 'kinza.ubaidullah.work@gmail.com', // Let's send a test to the developer email or a generic temp mail, wait, the user's email or a test one.
      subject: 'Test Email from Al Jaroshi CRM',
      html: '<p>If you receive this, the Resend API key is working perfectly!</p>'
    });
    console.log('Resend Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Resend Error Caught:', error);
  }
}

testEmail();
