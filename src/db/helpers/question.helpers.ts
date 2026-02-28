import { db } from '../connection';
import { questions, Question, NewQuestion, topics, subjects } from '../schema';
import { eq, inArray, sql } from 'drizzle-orm';

// Create question
export async function createQuestion(data: NewQuestion): Promise<Question> {
  const [question] = await db.insert(questions).values(data).returning();
  return question;
}

// Create multiple questions
export async function createQuestions(data: NewQuestion[]): Promise<Question[]> {
  if (data.length === 0) return [];
  return db.insert(questions).values(data).returning();
}

// Find question by ID
export async function findQuestionById(id: string): Promise<Question | undefined> {
  const [question] = await db.select().from(questions).where(eq(questions.id, id));
  return question;
}

// Find questions by IDs
export async function findQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  return db.select().from(questions).where(inArray(questions.id, ids));
}

// Find questions by topic
export async function findQuestionsByTopic(topicId: number): Promise<Question[]> {
  return db.select().from(questions).where(eq(questions.topicId, topicId));
}

// Find questions by topics
export async function findQuestionsByTopics(topicIds: number[]): Promise<Question[]> {
  if (topicIds.length === 0) return [];
  return db.select().from(questions).where(inArray(questions.topicId, topicIds));
}

// Get random question IDs from topics
export async function getRandomQuestionIdsFromTopics(
  topicIds: number[],
  limit: number
): Promise<string[]> {
  if (topicIds.length === 0) return [];

  // Optimization: Instead of using ORDER BY RANDOM() which forces a full table scan and sort,
  // we fetch all matching IDs and select randomly in memory.
  // UUIDs are small, and for typical topic sizes, fetching IDs is orders of magnitude
  // faster than generating a random number for every row and sorting in PostgreSQL.
  const allIds = await db
    .select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.topicId, topicIds));

  if (allIds.length === 0) return [];
  if (allIds.length <= limit) return allIds.map((r) => r.id);

  // Fisher-Yates shuffle for true randomness without sorting overhead
  const ids = allIds.map((r) => r.id);
  const result: string[] = [];

  for (let i = 0; i < limit; i++) {
    const randomIndex = Math.floor(Math.random() * (ids.length - i));
    result.push(ids[randomIndex]);
    // Swap the selected element with the end of the unselected portion
    ids[randomIndex] = ids[ids.length - 1 - i];
  }

  return result;
}

// Get random questions from topics
export async function getRandomQuestionsFromTopics(
  topicIds: number[],
  limit: number
): Promise<Question[]> {
  if (topicIds.length === 0) return [];

  // Optimization: Delegate to our fast ID selector to completely eliminate ORDER BY RANDOM()
  // and full table sorting overhead, while avoiding sorting large text fields.
  const ids = await getRandomQuestionIdsFromTopics(topicIds, limit);

  if (ids.length === 0) return [];

  // Fetch full details for the selected IDs
  const questionsData = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, ids));

  // Map results back to the random order of IDs
  const questionMap = new Map(questionsData.map((q) => [q.id, q]));

  // Return questions in the same order as the random IDs
  return ids
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => q !== undefined);
}

// Get questions with topic and subject info
export async function getQuestionsWithDetails(questionIds: string[]) {
  if (questionIds.length === 0) return [];

  return db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      options: questions.options,
      answer: questions.answer,
      explanation: questions.explanation,
      difficultyLevel: questions.difficultyLevel,
      standard: questions.standard,
      topicId: questions.topicId,
      topicName: topics.topicName,
      subjectId: subjects.id,
      subjectName: subjects.subjectName,
    })
    .from(questions)
    .leftJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(subjects, eq(topics.subjectId, subjects.id))
    .where(inArray(questions.id, questionIds));
}

// Count questions by topic
export async function countQuestionsByTopic(topicId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questions)
    .where(eq(questions.topicId, topicId));

  return result?.count ?? 0;
}
