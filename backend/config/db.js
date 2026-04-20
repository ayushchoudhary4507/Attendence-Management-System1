const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error.message);
    
    // Try alternative connection method
    if (error.message.includes('querySrv') || error.message.includes('ENOTFOUND')) {
      console.log('\n🔄 Trying direct connection...');
      try {
        const directUri = process.env.MONGODB_URI.replace('mongodb+srv://', 'mongodb://');
        const conn = await mongoose.connect(directUri, {
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          maxPoolSize: 10,
          retryWrites: true,
          retryReads: true,
          tls: true,
          tlsAllowInvalidCertificates: false
        });
        
        console.log(`✅ MongoDB Direct Connected: ${conn.connection.host}`);
        return true;
      } catch (directError) {
        console.error('❌ Direct connection also failed:', directError.message);
      }
    }
    
    console.log('\n🔧 Atlas Connection Issues:');
    console.log('1. IP Whitelist: Add your IP to Atlas Network Access');
    console.log('2. Network: Check internet connection');
    console.log('3. DNS: Try restarting your router/computer');
    console.log('4. Credentials: Verify Atlas username/password');
    console.log('5. Try: MongoDB Atlas -> Network Access -> Add IP -> Allow Access from Anywhere\n');
    console.log('⚠️ Falling back to mock authentication\n');
    return false;
  }
};

module.exports = connectDB;
