const dotenv = require('dotenv');
dotenv.config();

const sendEmail = require('./utils/sendEmail');

const test = async () => {
  console.log('Starting SMTP test...');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '********' : 'missing');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);

  try {
    const res = await sendEmail({
      to: process.env.SMTP_USER, // Send to self
      subject: 'Property Rental - SMTP Test Email',
      text: 'This is a test email to verify that SMTP settings are 100% correct.',
      html: '<h1>SMTP test successful!</h1><p>Your Property Rental mail server is working perfectly.</p>'
    });
    console.log('Test completed successfully!', res);
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

test();
