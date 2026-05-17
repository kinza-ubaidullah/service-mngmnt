const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    console.log('MySQL is running.');
    const [rows, fields] = await connection.execute('SHOW DATABASES LIKE "service_mgmt"');
    if (rows.length > 0) {
      console.log('Database "service_mgmt" exists.');
    } else {
      console.log('Database "service_mgmt" DOES NOT exist.');
      await connection.execute('CREATE DATABASE service_mgmt');
      console.log('Created database "service_mgmt".');
    }
    await connection.end();
  } catch (error) {
    console.error('Error connecting to MySQL:', error.message);
  }
}

testConnection();
