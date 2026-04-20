const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const addMobile = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.log('❌ MONGODB_URI not found in .env');
      process.exit(1);
    }
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'ayushchoudhary4507@gmail.com' });
    
    if (user) {
      user.mobile = '8219139553';
      await user.save();
      console.log('✅ Mobile added successfully!');
      console.log('Email:', user.email);
      console.log('Mobile:', user.mobile);
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

addMobile();
