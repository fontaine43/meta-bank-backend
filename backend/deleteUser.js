const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const result = await User.deleteOne({ username: "testuser" });
    console.log("Delete result:", result);
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
