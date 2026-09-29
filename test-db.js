const mongoose = require('mongoose');
require('dotenv').config({ path: './apps/api/.env' });

async function check() {
  const uri = process.env.MONGO_URI;
  if (!uri?.trim()) throw new Error('MONGO_URI is required.');
  await mongoose.connect(uri);
  
  const Video = mongoose.model('Video', new mongoose.Schema({}, { strict: false, collection: 'videos' }));
  const videos = await Video.find({ title: /Coriolis/i }).lean();
  console.log("VIDEOS:", JSON.stringify(videos, null, 2));

  const StudentEnrollment = mongoose.model('StudentEnrollment', new mongoose.Schema({}, { strict: false, collection: 'studentenrollments' }));
  const enrolls = await StudentEnrollment.find().lean();
  console.log("ENROLLMENTS COUNT:", enrolls.length);

  process.exit(0);
}
check();
