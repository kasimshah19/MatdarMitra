const { MongoClient } = require('mongodb');
async function run() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = client.db('matdarmitra');
  const total = await db.collection('voters').countDocuments({});
  const review = await db.collection('voters').countDocuments({needsReview: true});
  console.log('--- DATABASE COUNTS ---');
  console.log('db.voters.countDocuments({}):', total);
  console.log('db.voters.countDocuments({needsReview: true}):', review);
  console.log('\n--- SAMPLE 5 RECORDS ---');
  const docs = await db.collection('voters').find().limit(5).toArray();
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}
run();
