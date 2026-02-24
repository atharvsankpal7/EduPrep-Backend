import { db } from '../connection';
import {
  tests,
  testSections,
  testSectionQuestions,
  testResults,
  testResultAnswers,
  questions,
  cetDistributions,
  topics,
  Test,
  TestResult,
} from '../schema';
import { eq, and, desc, sql, inArray, asc } from 'drizzle-orm';
import { ApiError } from '../../utils/ApiError';

export interface CreateTestSectionInput {
  sectionName: string;
  sectionDuration: number;
  questionIds: string[];
}

export interface CreateTestInput {
  testName: string;
  totalDuration: number;
  totalQuestions: number;
  expiryTime?: Date | null;
  createdBy: number;
  sections: CreateTestSectionInput[];
}

export interface CreateTestResultAnswerInput {
  questionId: string;
  selectedOption: number;
  sectionId?: string | null;
}

export interface CreateTestResultInput {
  testId: string;
  studentId: number;
  score: number;
  timeTaken: number;
  isAutoSubmitted: boolean;
  tabSwitches: number;
  answers: CreateTestResultAnswerInput[];
}


interface CETTopicAvailabilityRow {
  subjectName: string;
  topicId: number | null;
  topicName: string | null;
  expectedCount: number;
  actualCount: number;
}

interface CETSelectedQuestionRow {
  subjectName: string;
  topicId: number;
  questionId: string;
}

export interface CreateCETTestResult {
  test: Test;
  sections: CreateTestSectionInput[];
}

export async function createCETTestWithDistribution(createdBy: number): Promise<CreateCETTestResult> {
  return db.transaction(async (tx) => {
    const availabilityResult = await tx.execute<CETTopicAvailabilityRow>(sql`
      with latest_distribution as (
        select distributions
        from ${cetDistributions}
        order by ${cetDistributions.updatedAt} desc, ${cetDistributions.id} desc
        limit 1
      ),
      distribution_topics as (
        select
          lower(subject_item->>'subject') as "subjectName",
          topic_item->>'topicName' as "topicName",
          nullif(topic_item->>'topicId', '')::int as "topicId",
          (topic_item->>'questionCount')::int as "expectedCount"
        from latest_distribution,
        lateral jsonb_array_elements(distributions) as subject_item,
        lateral jsonb_array_elements(subject_item->'topics') as topic_item
      ),
      resolved_topics as (
        select
          dt."subjectName",
          coalesce(dt."topicId", t.id) as "topicId",
          dt."topicName",
          dt."expectedCount"
        from distribution_topics dt
        left join ${topics} t
          on lower(t.topic_name) = lower(dt."topicName")
      )
      select
        rt."subjectName",
        rt."topicId",
        rt."topicName",
        rt."expectedCount",
        count(q.id)::int as "actualCount"
      from resolved_topics rt
      left join ${questions} q
        on q.topic_id = rt."topicId"
      group by rt."subjectName", rt."topicId", rt."topicName", rt."expectedCount"
    `);

    if (availabilityResult.rows.length === 0) {
      throw new ApiError(404, 'CET distribution configuration not found');
    }

    const invalidTopics = availabilityResult.rows.filter((row) => !row.topicId);
    if (invalidTopics.length > 0) {
      throw new ApiError(404, `Topic not found in CET distribution: ${invalidTopics[0].topicName}`);
    }

    const insufficientTopics = availabilityResult.rows.filter(
      (row) => row.actualCount < row.expectedCount
    );

    if (insufficientTopics.length > 0) {
      const topic = insufficientTopics[0];
      throw new ApiError(400, `Insufficient questions for topic ${topic.topicName}. Needed: ${topic.expectedCount}, Found: ${topic.actualCount}`);
    }

    const selectedResult = await tx.execute<CETSelectedQuestionRow>(sql`
      with latest_distribution as (
        select distributions
        from ${cetDistributions}
        order by ${cetDistributions.updatedAt} desc, ${cetDistributions.id} desc
        limit 1
      ),
      distribution_topics as (
        select
          lower(subject_item->>'subject') as "subjectName",
          topic_item->>'topicName' as "topicName",
          nullif(topic_item->>'topicId', '')::int as "topicId",
          (topic_item->>'questionCount')::int as "questionCount"
        from latest_distribution,
        lateral jsonb_array_elements(distributions) as subject_item,
        lateral jsonb_array_elements(subject_item->'topics') as topic_item
      ),
      resolved_topics as (
        select
          dt."subjectName",
          coalesce(dt."topicId", t.id) as "topicId",
          dt."questionCount"
        from distribution_topics dt
        left join ${topics} t
          on lower(t.topic_name) = lower(dt."topicName")
      ),
      ranked_questions as (
        select
          rt."subjectName",
          rt."topicId",
          rt."questionCount",
          q.id as "questionId",
          row_number() over (
            partition by rt."subjectName", rt."topicId"
            order by random()
          ) as rn
        from resolved_topics rt
        join ${questions} q
          on q.topic_id = rt."topicId"
      )
      select
        rq."subjectName",
        rq."topicId",
        rq."questionId"
      from ranked_questions rq
      where rq.rn <= rq."questionCount"
    `);

    const subjectQuestionIds: Record<string, string[]> = selectedResult.rows.reduce(
      (acc, row) => {
        if (!acc[row.subjectName]) {
          acc[row.subjectName] = [];
        }
        acc[row.subjectName].push(row.questionId);
        return acc;
      },
      {} as Record<string, string[]>
    );

    const physicsQuestionIds = subjectQuestionIds.physics ?? [];
    const chemistryQuestionIds = subjectQuestionIds.chemistry ?? [];
    const mathematicsQuestionIds = subjectQuestionIds.mathematics ?? [];

    if (physicsQuestionIds.length === 0 || chemistryQuestionIds.length === 0 || mathematicsQuestionIds.length === 0) {
      throw new ApiError(500, 'Insufficient questions available for test creation');
    }

    const sections: CreateTestSectionInput[] = [
      {
        sectionName: 'Physics and Chemistry',
        sectionDuration: 90,
        questionIds: [...physicsQuestionIds, ...chemistryQuestionIds],
      },
      {
        sectionName: 'Mathematics',
        sectionDuration: 90,
        questionIds: mathematicsQuestionIds,
      },
    ];

    const [test] = await tx
      .insert(tests)
      .values({
        testName: `CET Test ${Date.now()}`,
        totalDuration: 180,
        totalQuestions: sections[0].questionIds.length + sections[1].questionIds.length,
        expiryTime: null,
        createdBy,
      })
      .returning();

    const sectionRows = await tx
      .insert(testSections)
      .values(
        sections.map((section) => ({
          testId: test.id,
          sectionName: section.sectionName,
          sectionDuration: section.sectionDuration,
          totalQuestions: section.questionIds.length,
        }))
      )
      .returning();

    const sectionQuestions = sectionRows.flatMap((section, sectionIndex) =>
      sections[sectionIndex].questionIds.map((questionId, index) => ({
        testSectionId: section.id,
        questionId,
        questionOrder: index + 1,
      }))
    );

    if (sectionQuestions.length > 0) {
      await tx.insert(testSectionQuestions).values(sectionQuestions);
    }

    return { test, sections };
  });
}

// Create test with sections and questions
export async function createTestWithSections(data: CreateTestInput): Promise<Test> {
  return db.transaction(async (tx) => {
    const [test] = await tx
      .insert(tests)
      .values({
        testName: data.testName,
        totalDuration: data.totalDuration,
        totalQuestions: data.totalQuestions,
        expiryTime: data.expiryTime ?? null,
        createdBy: data.createdBy,
      })
      .returning();

    const sectionRows = await tx
      .insert(testSections)
      .values(
        data.sections.map((section) => ({
          testId: test.id,
          sectionName: section.sectionName,
          sectionDuration: section.sectionDuration,
          totalQuestions: section.questionIds.length,
        }))
      )
      .returning();

    const sectionQuestions = sectionRows.flatMap((section, sectionIndex) => {
      const questionIds = data.sections[sectionIndex].questionIds;
      return questionIds.map((questionId, index) => ({
        testSectionId: section.id,
        questionId,
        questionOrder: index + 1,
      }));
    });

    if (sectionQuestions.length > 0) {
      await tx.insert(testSectionQuestions).values(sectionQuestions);
    }

    return test;
  });
}

// Find test by ID
export async function findTestById(id: string): Promise<Test | undefined> {
  const [test] = await db.select().from(tests).where(eq(tests.id, id));
  return test;
}

export interface TestQuestionInfo {
  questionId: string;
  sectionId: string;
  answer: number;
  questionOrder: number;
}

export async function getTestQuestionInfo(testId: string): Promise<TestQuestionInfo[]> {
  return db
    .select({
      questionId: testSectionQuestions.questionId,
      sectionId: testSectionQuestions.testSectionId,
      answer: questions.answer,
      questionOrder: testSectionQuestions.questionOrder,
    })
    .from(testSections)
    .innerJoin(testSectionQuestions, eq(testSectionQuestions.testSectionId, testSections.id))
    .innerJoin(questions, eq(testSectionQuestions.questionId, questions.id))
    .where(eq(testSections.testId, testId))
    .orderBy(asc(testSectionQuestions.questionOrder));
}

// Find test with questions populated
export async function findTestWithQuestions(id: string) {
  const test = await findTestById(id);
  if (!test) return null;

  const rows = await db
    .select({
      sectionId: testSections.id,
      sectionName: testSections.sectionName,
      sectionDuration: testSections.sectionDuration,
      totalQuestions: testSections.totalQuestions,
      questionId: questions.id,
      questionText: questions.questionText,
      options: questions.options,
      answer: questions.answer,
      explanation: questions.explanation,
      questionOrder: testSectionQuestions.questionOrder,
    })
    .from(testSections)
    .leftJoin(testSectionQuestions, eq(testSectionQuestions.testSectionId, testSections.id))
    .leftJoin(questions, eq(testSectionQuestions.questionId, questions.id))
    .where(eq(testSections.testId, id))
    .orderBy(asc(testSections.createdAt), asc(testSectionQuestions.questionOrder));

  const sectionMap = new Map<string, { sectionName: string; sectionDuration: number; totalQuestions: number; questions: any[] }>();
  rows.forEach((row) => {
    if (!sectionMap.has(row.sectionId)) {
      sectionMap.set(row.sectionId, {
        sectionName: row.sectionName,
        sectionDuration: row.sectionDuration,
        totalQuestions: row.totalQuestions,
        questions: [],
      });
    }

    if (row.questionId) {
      sectionMap.get(row.sectionId)!.questions.push({
        id: row.questionId,
        questionText: row.questionText,
        options: row.options,
        answer: row.answer,
        explanation: row.explanation,
      });
    }
  });

  return {
    ...test,
    sections: Array.from(sectionMap.values()),
  };
}

// Get tests by user
export async function getTestsByUser(userId: number): Promise<Test[]> {
  return db.select().from(tests).where(eq(tests.createdBy, userId)).orderBy(desc(tests.createdAt));
}

// Create test result with answers
export async function createTestResultWithAnswers(data: CreateTestResultInput): Promise<TestResult> {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .insert(testResults)
      .values({
        testId: data.testId,
        studentId: data.studentId,
        score: data.score,
        timeTaken: data.timeTaken,
        isAutoSubmitted: data.isAutoSubmitted,
        tabSwitches: data.tabSwitches,
      })
      .returning();

    if (data.answers.length > 0) {
      await tx.insert(testResultAnswers).values(
        data.answers.map((answer) => ({
          testResultId: result.id,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          sectionId: answer.sectionId ?? null,
        }))
      );
    }

    return result;
  });
}

// Find test result by ID
export async function findTestResultById(id: string): Promise<TestResult | undefined> {
  const [result] = await db.select().from(testResults).where(eq(testResults.id, id));
  return result;
}

// Find test results by student
export async function findTestResultsByStudent(studentId: number): Promise<TestResult[]> {
  return db
    .select()
    .from(testResults)
    .where(eq(testResults.studentId, studentId))
    .orderBy(desc(testResults.createdAt));
}

// Count test results for student
export async function countTestResultsByStudent(studentId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testResults)
    .where(eq(testResults.studentId, studentId));

  const count = result?.count ?? 0;
  return typeof count === 'number' ? count : Number(count);
}

// Get paginated test history with test details
export async function getStudentTestHistoryPaginated(
  studentId: number,
  limit: number,
  offset: number
) {
  return db
    .select({
      id: testResults.id,
      testId: testResults.testId,
      score: testResults.score,
      timeTaken: testResults.timeTaken,
      createdAt: testResults.createdAt,
      testName: tests.testName,
      totalQuestions: tests.totalQuestions,
      totalDuration: tests.totalDuration,
      percentageScore: sql<number>`CASE WHEN ${tests.totalQuestions} > 0 THEN (${testResults.score}::float / ${tests.totalQuestions}) * 100 ELSE 0 END`,
    })
    .from(testResults)
    .leftJoin(tests, eq(testResults.testId, tests.id))
    .where(eq(testResults.studentId, studentId))
    .orderBy(desc(testResults.createdAt))
    .limit(limit)
    .offset(offset);
}

// Find test result for student with test details
export async function findTestResultWithTest(
  resultId: string,
  studentId: number
) {
  const [result] = await db
    .select({
      id: testResults.id,
      testId: testResults.testId,
      score: testResults.score,
      timeTaken: testResults.timeTaken,
      createdAt: testResults.createdAt,
      isAutoSubmitted: testResults.isAutoSubmitted,
      tabSwitches: testResults.tabSwitches,
      testName: tests.testName,
      totalQuestions: sql<number>`COALESCE(${tests.totalQuestions}, 0)`,
    })
    .from(testResults)
    .leftJoin(tests, eq(testResults.testId, tests.id))
    .where(and(eq(testResults.id, resultId), eq(testResults.studentId, studentId)));

  return result;
}

export async function getTestResultAnswers(resultId: string) {
  return db
    .select({
      questionId: testResultAnswers.questionId,
      selectedOption: testResultAnswers.selectedOption,
      sectionId: testResultAnswers.sectionId,
    })
    .from(testResultAnswers)
    .where(eq(testResultAnswers.testResultId, resultId));
}

// Get test result answers with question details
export async function getTestResultAnswersWithQuestionDetails(resultId: string) {
  return db
    .select({
      questionId: testResultAnswers.questionId,
      selectedOption: testResultAnswers.selectedOption,
      sectionId: testResultAnswers.sectionId,
      questionText: questions.questionText,
      options: questions.options,
      answer: questions.answer,
    })
    .from(testResultAnswers)
    .innerJoin(questions, eq(testResultAnswers.questionId, questions.id))
    .where(eq(testResultAnswers.testResultId, resultId));
}

// Get recent tests (joined) for student
export async function getRecentTestsByStudent(studentId: number, limit: number) {
  return db
    .select({
      id: testResults.id,
      testId: testResults.testId,
      score: testResults.score,
      createdAt: testResults.createdAt,
      testName: tests.testName,
      totalQuestions: tests.totalQuestions,
      percentageScore: sql<number>`CASE WHEN ${tests.totalQuestions} > 0 THEN (${testResults.score}::float / ${tests.totalQuestions}) * 100 ELSE 0 END`,
    })
    .from(testResults)
    .leftJoin(tests, eq(testResults.testId, tests.id))
    .where(eq(testResults.studentId, studentId))
    .orderBy(desc(testResults.createdAt))
    .limit(limit);
}

export interface UserPerformanceSummary {
  totalTests: number;
  totalScore: number;
  totalQuestions: number;
}

// Aggregate performance summary for student
export async function getUserPerformanceSummary(
  studentId: number
): Promise<UserPerformanceSummary> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS "totalTests",
      COALESCE(SUM(tr.score), 0)::int AS "totalScore",
      COALESCE(SUM(t.total_questions), 0)::int AS "totalQuestions"
    FROM test_results tr
    JOIN tests t ON t.id = tr.test_id
    WHERE tr.student_id = ${studentId}
  `);

  const row = (result as unknown as { rows: UserPerformanceSummary[] }).rows[0];
  return row ?? { totalTests: 0, totalScore: 0, totalQuestions: 0 };
}

export interface TopicPerformanceRow {
  topicId: number;
  topicName: string;
  total: number;
  correct: number;
  incorrect: number;
}

// Compute topic performance by joining result answers in SQL
export async function getTopicPerformanceForStudent(
  studentId: number
): Promise<TopicPerformanceRow[]> {
  const result = await db.execute(sql`
    SELECT
      q.topic_id AS "topicId",
      t.topic_name AS "topicName",
      COUNT(*)::int AS "total",
      SUM(CASE WHEN tra.selected_option = q.answer THEN 1 ELSE 0 END)::int AS "correct",
      (COUNT(*)::int - SUM(CASE WHEN tra.selected_option = q.answer THEN 1 ELSE 0 END)::int) AS "incorrect"
    FROM test_results tr
    JOIN test_result_answers tra ON tra.test_result_id = tr.id
    JOIN questions q ON q.id = tra.question_id
    JOIN topics t ON t.id = q.topic_id
    WHERE tr.student_id = ${studentId}
    GROUP BY q.topic_id, t.topic_name
  `);

  return (result as unknown as { rows: TopicPerformanceRow[] }).rows;
}
// Find test results by test
export async function findTestResultsByTest(testId: string): Promise<TestResult[]> {
  return db
    .select()
    .from(testResults)
    .where(eq(testResults.testId, testId))
    .orderBy(desc(testResults.createdAt));
}

// Find specific test result for student and test
export async function findStudentTestResult(
  studentId: number,
  testId: string
): Promise<TestResult | undefined> {
  const [result] = await db
    .select()
    .from(testResults)
    .where(and(eq(testResults.studentId, studentId), eq(testResults.testId, testId)));

  return result;
}

// Get test history with test details
export async function getStudentTestHistory(studentId: number) {
  return db
    .select({
      id: testResults.id,
      score: testResults.score,
      timeTaken: testResults.timeTaken,
      createdAt: testResults.createdAt,
      testId: tests.id,
      testName: tests.testName,
      totalQuestions: tests.totalQuestions,
      totalDuration: tests.totalDuration,
    })
    .from(testResults)
    .leftJoin(tests, eq(testResults.testId, tests.id))
    .where(eq(testResults.studentId, studentId))
    .orderBy(desc(testResults.createdAt));
}

// Get leaderboard for a test
export async function getTestLeaderboard(testId: string, limit = 10) {
  return db
    .select({
      rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${testResults.score} DESC, ${testResults.timeTaken} ASC)`,
      studentId: testResults.studentId,
      score: testResults.score,
      timeTaken: testResults.timeTaken,
    })
    .from(testResults)
    .where(eq(testResults.testId, testId))
    .limit(limit);
}
