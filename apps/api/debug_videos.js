require('dotenv').config({ path: '/Users/zumerkekillioglu/Desktop/atls/apps/api/.env' });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Video = mongoose.model('Video', new mongoose.Schema({}, { strict: false }));
    const videos = await Video.find({ title: /Coriolis/i }).lean();
    console.log(JSON.stringify(videos, null, 2));
    process.exit(0);
}
run();
