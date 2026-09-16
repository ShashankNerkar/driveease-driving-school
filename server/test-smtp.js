const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('\n🔍 Testing SMTP Configuration...\n');
  
  // Mask sensitive data for display
  const maskEmail = (email) => {
    if (!email) return 'NOT SET';
    const [user, domain] = email.split('@');
    return `${user.substring(0, 2)}***@${domain}`;
  };
  
  const maskPassword = (pass) => {
    if (!pass) return 'NOT SET';
    return `${pass.substring(0, 2)}${'*'.repeat(pass.length - 2)}`;
  };
  
  console.log('📋 Configuration loaded:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('  EMAIL_SECURE:', process.env.EMAIL_SECURE || 'NOT SET');
  console.log('  EMAIL_USER:', maskEmail(process.env.EMAIL_USER));
  console.log('  EMAIL_PASS:', maskPassword(process.env.EMAIL_PASS));
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
  console.log();
  
  // Check for common issues
  console.log('🔧 Pre-flight checks:');
  const issues = [];
  
  if (!process.env.EMAIL_HOST || process.env.EMAIL_HOST === 'smtp.your-provider.com') {
    issues.push('❌ EMAIL_HOST is not set or using placeholder value');
  } else {
    console.log('  ✅ EMAIL_HOST is set');
  }
  
  if (!process.env.EMAIL_USER) {
    issues.push('❌ EMAIL_USER is not set');
  } else {
    console.log('  ✅ EMAIL_USER is set');
  }
  
  if (!process.env.EMAIL_PASS) {
    issues.push('❌ EMAIL_PASS is not set');
  } else {
    console.log('  ✅ EMAIL_PASS is set');
  }
  
  // Check for common syntax errors
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.endsWith('s')) {
    issues.push('⚠️  EMAIL_FROM has extra character at the end');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Configuration Issues Found:');
    issues.forEach(issue => console.log('  ' + issue));
    console.log();
  }
  
  // Create transporter
  console.log('📧 Creating SMTP transporter...');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true, // Enable debug output
    logger: false, // Disable built-in logger to control output
  });
  
  // Test connection
  try {
    console.log('🔌 Testing SMTP connection...\n');
    await transporter.verify();
    console.log('\n✅ SMTP connection successful!\n');
    
    // Try sending a test email
    console.log('📮 Sending test email...\n');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"DriveEase" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'DriveEase SMTP Test',
      html: `
        <h2>SMTP Configuration Test</h2>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
      `,
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Check your inbox:', maskEmail(process.env.EMAIL_USER));
    console.log();
    
  } catch (error) {
    console.log('\n❌ SMTP Error:\n');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Suggested Fix:');
      console.log('   Authentication failed. Common causes:');
      console.log('   1. Wrong password (check EMAIL_PASS in .env)');
      console.log('   2. Gmail: Need to use App Password, not regular password');
      console.log('      → Enable 2FA: https://myaccount.google.com/security');
      console.log('      → Generate App Password: https://myaccount.google.com/apppasswords');
      console.log('   3. "Less secure app access" is disabled (deprecated by Google)');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n🔧 Suggested Fix:');
      console.log('   Connection failed. Common causes:');
      console.log('   1. Check EMAIL_HOST (should be smtp.gmail.com for Gmail)');
      console.log('   2. Check EMAIL_PORT (587 for TLS, 465 for SSL)');
      console.log('   3. Firewall/antivirus blocking SMTP ports');
      console.log('   4. Network connectivity issues');
    } else if (error.code === 'ESOCKET') {
      console.log('\n🔧 Suggested Fix:');
      console.log('   Socket error. Check if:');
      console.log('   1. EMAIL_HOST is correct');
      console.log('   2. Port is not blocked by firewall');
    }
    
    console.log('\n📋 Full Error Details:');
    console.log(error);
    console.log();
    process.exit(1);
  }
}

testSMTP().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
