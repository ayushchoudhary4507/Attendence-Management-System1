const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('\n=== USERS (' + users.length + ') ===');
  users.forEach(u => {
    const img = u.profileImage ? u.profileImage.substring(0, 80) : 'NONE';
    console.log('  name=' + u.name + ' | email=' + u.email + ' | profileImage=' + img);
  });

  const employees = await db.collection('employees').find({}).toArray();
  console.log('\n=== EMPLOYEES (' + employees.length + ') ===');
  employees.forEach(e => {
    const img = e.profileImage ? e.profileImage.substring(0, 80) : 'NONE';
    const photo = e.photo ? e.photo.substring(0, 80) : 'NONE';
    console.log('  name=' + e.name + ' | email=' + e.email + ' | profileImage=' + img + ' | photo=' + photo);
  });

  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
