const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY || "re_gucUE1Yg_Bvqr6K11x6wGWixJXUnaEeJm");

async function run() {
  console.log("Using API key:", process.env.RESEND_API_KEY || "re_gucUE1Yg_Bvqr6K11x6wGWixJXUnaEeJm");
  try {
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kinzaubaidullah62@gmail.com', // User's email
      subject: 'Test email from Antigravity AI',
      html: '<p>If you get this, Resend works!</p>'
    });
    console.log("Response:", response);
  } catch (error) {
    console.error("Exception:", error);
  }
}

run();
