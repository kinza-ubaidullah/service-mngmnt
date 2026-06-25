const fs = require('fs');

try {
  let content = fs.readFileSync('../full_schema.sql', 'utf8');
  // Remove all the corrupted chinese text at the bottom.
  // The corrupted text appears after the last ALTER TABLE or at the end.
  // Let's just find the last valid SQL statement and truncate after it.
  const lastValidIndex = content.lastIndexOf('ON UPDATE CASCADE;');
  
  if (lastValidIndex !== -1) {
    // Keep everything up to the last valid line
    content = content.substring(0, lastValidIndex + 'ON UPDATE CASCADE;'.length);
    
    // Add the correct admin seed
    const seed = `\n\n-- INSERT DEFAULT ADMIN\nINSERT INTO \`users\` (\`name\`, \`email\`, \`phone\`, \`password_hash\`, \`plain_password\`, \`role\`, \`is_active\`, \`created_at\`) \nVALUES ('Super Admin', 'kinzaubaidullah62@gmail.com', '1234567890', '$2b$10$PeVA.CCpppoTVyvspNAtFO7AbmvG0sOfA8xdyBqDANiK9cqrRU3OS', 'admin123', 'ADMIN', 1, NOW());\n`;
    
    fs.writeFileSync('../full_schema.sql', content + seed, 'utf8');
    console.log('Successfully fixed full_schema.sql');
  } else {
    // If we can't find it, we'll try reading it as utf16le just in case
    let utf16Content = fs.readFileSync('../full_schema.sql', 'utf16le');
    const lastValidIndex16 = utf16Content.lastIndexOf('ON UPDATE CASCADE;');
    if (lastValidIndex16 !== -1) {
      utf16Content = utf16Content.substring(0, lastValidIndex16 + 'ON UPDATE CASCADE;'.length);
      const seed = `\n\n-- INSERT DEFAULT ADMIN\nINSERT INTO \`users\` (\`name\`, \`email\`, \`phone\`, \`password_hash\`, \`plain_password\`, \`role\`, \`is_active\`, \`created_at\`) \nVALUES ('Super Admin', 'kinzaubaidullah62@gmail.com', '1234567890', '$2b$10$PeVA.CCpppoTVyvspNAtFO7AbmvG0sOfA8xdyBqDANiK9cqrRU3OS', 'admin123', 'ADMIN', 1, NOW());\n`;
      fs.writeFileSync('../full_schema.sql', utf16Content + seed, 'utf8');
      console.log('Successfully fixed full_schema.sql (from UTF16)');
    } else {
      console.log('Could not find last valid statement.');
    }
  }
} catch (e) {
  console.error(e);
}
