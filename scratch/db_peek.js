const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gangulisabyasachi2705_db_user:B4cXXWlPhzoBy6iX@wisdomcluster.uadzxij.mongodb.net/wisdomDB?appName=wisdomCluster";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const usersCollection = mongoose.connection.db.collection('users');
    const user = await usersCollection.findOne({});
    
    if (user) {
      console.log("Sample user record keys:", Object.keys(user));
      // Log some non-sensitive field values to confirm types
      console.log("Sample user (masked):", {
        _id: user._id,
        email: user.email ? "YES" : "NO",
        username: user.username ? "YES" : "NO",
        password: user.password ? "YES (length: " + user.password.length + ")" : "NO"
      });
    } else {
      console.log("No users found in 'users' collection.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
