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

  const randomIds = await db
    .select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.topicId, topicIds))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return randomIds.map((r) => r.id);
}

// Get random questions from topics
export async function getRandomQuestionsFromTopics(
  topicIds: number[],
  limit: number
): Promise<Question[]> {
  if (topicIds.length === 0) return [];

  // Optimization: Fetch only IDs first to avoid sorting large text fields (like questionText, explanation)
  // This reduces the data moved during the sort operation significantly.
  const randomIds = await db
    .select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.topicId, topicIds))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  if (randomIds.length === 0) return [];

  const ids = randomIds.map((r) => r.id);

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
