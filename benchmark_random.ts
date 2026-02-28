import { db } from './src/db/connection';
import { questions, topics, subjects } from './src/db/schema';
import { inArray, sql, eq } from 'drizzle-orm';
import { getRandomQuestionIdsFromTopics } from './src/db/helpers/question.helpers';
import crypto from 'crypto';

async function setup() {
  console.log('Setting up test data...');

  // Create subject and topic if needed
  let subjectId = 1;
  let topicId = 1;

  try {
    const subRes = await db.insert(subjects).values({ id: subjectId, subjectName: 'Benchmark Subject' }).returning().onConflictDoNothing();
    const topRes = await db.insert(topics).values({ id: topicId, subjectId, topicName: 'Benchmark Topic' }).returning().onConflictDoNothing();
  } catch (e) {
    console.log('Topics/subjects exist or err:', e.message);
  }

  // Count existing questions
  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(questions).where(eq(questions.topicId, topicId));
  console.log(`Current questions in topic ${topicId}: ${count}`);

  if (count < 10000) {
    console.log('Inserting 10000 questions for benchmark...');
    const BATCH_SIZE = 1000;
    for (let i = 0; i < 10; i++) {
      const batch = Array.from({ length: BATCH_SIZE }).map((_, idx) => ({
        topicId: topicId,
        questionText: `Question ${i * BATCH_SIZE + idx} ` + crypto.randomBytes(50).toString('hex'),
        options: ['A', 'B', 'C', 'D'],
        answer: 0,
        difficultyLevel: 'medium' as const,
        standard: 10,
        explanation: 'Because ' + crypto.randomBytes(100).toString('hex')
      }));
      await db.insert(questions).values(batch);
      console.log(`Inserted batch ${i+1}/10`);
    }
    console.log('Insertion complete.');
  }

  return topicId;
}

async function runBenchmark(topicId: number) {
  console.log('\nRunning benchmark for getRandomQuestionIdsFromTopics...');
  const iterations = 50;
  const limit = 10;

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await getRandomQuestionIdsFromTopics([topicId], limit);
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per iteration: ${avgTime.toFixed(2)}ms`);
}

async function main() {
  const topicId = await setup();
  await runBenchmark(topicId);
  process.exit(0);
}

main().catch(console.error);
