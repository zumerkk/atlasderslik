import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: './apps/api/.env' });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGO_URI');
    return;
  }
  
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const db = mongoose.connection.db;
  const questions = db.collection('questions');
  
  // Find questions where subjectId is not an ObjectId
  const allQs = await questions.find({}).toArray();
  let invalidCount = 0;
  
  for (const q of allQs) {
    if (!q.subjectId || typeof q.subjectId === 'string') {
      console.log(`Found invalid question ${q._id} with subjectId: "${q.subjectId}"`);
      await questions.deleteOne({ _id: q._id });
      invalidCount++;
    }
  }
  
  console.log(`Deleted ${invalidCount} invalid questions.`);
  
  const tests = db.collection('tests');
  const allTests = await tests.find({}).toArray();
  let invalidTestsCount = 0;
  
  for (const t of allTests) {
    if (!t.subjectId || typeof t.subjectId === 'string') {
      console.log(`Found invalid test ${t._id} with subjectId: "${t.subjectId}"`);
      await tests.deleteOne({ _id: t._id });
      invalidTestsCount++;
    }
  }
  
  console.log(`Deleted ${invalidTestsCount} invalid tests.`);
  
  process.exit(0);
}

run().catch(console.error);
