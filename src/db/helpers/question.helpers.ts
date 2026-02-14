import { db } from '../connection';
import { questions, Question, NewQuestion, topics, subjects } from '../schema';
import { eq, inArray, sql, and } from 'drizzle-orm';

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

// Get random questions from topics
export async function getRandomQuestionsFromTopics(
  topicIds: number[],
  limit: number
): Promise<Question[]> {
  if (topicIds.length === 0) return [];

  // Optimized: Select IDs first to avoid sorting wide rows
  const randomIdsResult = await db
    .select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.topicId, topicIds))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  const randomIds = randomIdsResult.map((r) => r.id);

  if (randomIds.length === 0) return [];

  const resultQuestions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, randomIds));

  // Re-sort to match the random order of IDs
  const questionsMap = new Map(resultQuestions.map((q) => [q.id, q]));
  return randomIds
    .map((id) => questionsMap.get(id))
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
