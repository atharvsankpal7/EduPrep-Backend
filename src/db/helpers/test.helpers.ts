import { db } from '../connection';
import {
  tests,
  testSections,
  testSectionQuestions,
  testResults,
  testResultAnswers,
  questions,
  Test,
  TestResult,
} from '../schema';
import { eq, and, desc, sql, inArray, asc } from 'drizzle-orm';

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

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createTestWithSectionsTx(
  tx: TxClient,
  data: CreateTestInput,
): Promise<Test> {
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
      data.sections.map((section, index) => ({
        testId: test.id,
        sectionName: section.sectionName,
        sectionDuration: section.sectionDuration,
        totalQuestions: section.questionIds.length,
        sectionOrder: index + 1,
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
}

// Create test with sections and questions
export async function createTestWithSections(data: CreateTestInput): Promise<Test> {
  return db.transaction(async (tx) => createTestWithSectionsTx(tx, data));
}

export interface CETSectionSummary {
  name: string;
  duration: number;
  questionCount: number;
}

export interface CETTestDetails {
  testId: string;
  name: string;
  duration: number;
  totalQuestions: number;
  sections: CETSectionSummary[];
}

interface CETSelectedQuestionRow {
  questionId: string;
  sectionName: string;
  sectionOrder: number;
}

export async function createCETTestFromDistribution(
  createdBy: number,
  distributionId = 1,
): Promise<CETTestDetails | null> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      WITH distribution AS (
        SELECT
          (topic_elem->>'topicId')::int AS topic_id,
          (topic_elem->>'questionCount')::int AS question_count
        FROM cet_distributions cd,
             jsonb_array_elements(cd.distributions::jsonb) AS elem,
             LATERAL jsonb_array_elements(
               CASE
                 WHEN elem ? 'topics' THEN elem->'topics'
                 ELSE jsonb_build_array(elem)
               END
             ) AS topic_elem
        WHERE cd.id = ${distributionId}
          AND topic_elem ? 'topicId'
          AND topic_elem ? 'questionCount'
          AND (topic_elem->>'questionCount')::int > 0
      ),
      grouped_distribution AS (
        SELECT
          topic_id,
          SUM(question_count)::int AS question_count
        FROM distribution
        GROUP BY topic_id
      ),
      randomly_selected AS (
        SELECT
          q.id AS question_id,
          s.subject_name
        FROM grouped_distribution d
        CROSS JOIN LATERAL (
          SELECT q.id, q.topic_id
          FROM questions q
          WHERE q.topic_id = d.topic_id
          ORDER BY RANDOM()
          LIMIT d.question_count
        ) AS q
        INNER JOIN topics t ON t.id = q.topic_id
        INNER JOIN subjects s ON s.id = t.subject_id
      ),
      classified_questions AS (
        SELECT
          rs.question_id,
          CASE
            WHEN lower(rs.subject_name) IN ('mathematics', 'maths') THEN 'Mathematics'
            ELSE 'Physics and Chemistry'
          END AS section_name,
          CASE
            WHEN lower(rs.subject_name) IN ('mathematics', 'maths') THEN 2
            ELSE 1
          END AS section_order
        FROM randomly_selected rs
      ),
      ordered_questions AS (
        SELECT
          cq.question_id,
          cq.section_name,
          cq.section_order,
          ROW_NUMBER() OVER (PARTITION BY cq.section_order ORDER BY RANDOM()) AS question_order
        FROM classified_questions cq
      )
      SELECT
        oq.question_id AS "questionId",
        oq.section_name AS "sectionName",
        oq.section_order AS "sectionOrder"
      FROM ordered_questions oq
      ORDER BY oq.section_order, oq.question_order;
    `);

    const selectedQuestions = (result as unknown as {
      rows: CETSelectedQuestionRow[];
    }).rows;

    if (selectedQuestions.length === 0) {
      return null;
    }

    const sectionsMap = new Map<number, CreateTestSectionInput>();

    for (const row of selectedQuestions) {
      if (!sectionsMap.has(row.sectionOrder)) {
        sectionsMap.set(row.sectionOrder, {
          sectionName: row.sectionName,
          sectionDuration: 90,
          questionIds: [],
        });
      }

      sectionsMap.get(row.sectionOrder)!.questionIds.push(row.questionId);
    }

    const sections = Array.from(sectionsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1]);

    const test = await createTestWithSectionsTx(tx, {
      testName: `CET Test ${Date.now()}`,
      totalDuration: 180,
      totalQuestions: selectedQuestions.length,
      createdBy,
      sections,
    });

    return {
      testId: test.id,
      name: test.testName,
      duration: test.totalDuration,
      totalQuestions: test.totalQuestions,
      sections: sections.map((section) => ({
        name: section.sectionName,
        duration: section.sectionDuration,
        questionCount: section.questionIds.length,
      })),
    };
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
    .orderBy(asc(testSections.sectionOrder), asc(testSections.createdAt), asc(testSectionQuestions.questionOrder));
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
    .orderBy(asc(testSections.sectionOrder), asc(testSections.createdAt), asc(testSectionQuestions.questionOrder));

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

// ── Canonical question-analysis builder ──────────────────────────────────
// Uses findTestWithQuestions (the same query that builds the test for the student)
// as the single source of truth for question ordering.

export interface OrderedQuestionAnalysisItem {
  questionId: string;
  questionText: string;
  options: unknown;
  selectedOption: number;   // 0-based for the frontend (-1 = skipped)
  correctOption: number;    // 0-based for the frontend
  isCorrect: boolean;
}

interface AnswerLookupEntry {
  questionId: string;
  selectedOption: number;   // 1-based as stored in DB (-1 = unanswered)
}

export async function buildOrderedQuestionAnalysis(
  testId: string,
  answers: AnswerLookupEntry[],
): Promise<OrderedQuestionAnalysisItem[]> {
  const testWithQuestions = await findTestWithQuestions(testId);
  if (!testWithQuestions) return [];

  const answerMap = new Map(
    answers.map((a) => [a.questionId, a.selectedOption]),
  );

  const analysis: OrderedQuestionAnalysisItem[] = [];

  for (const section of testWithQuestions.sections) {
    for (const question of section.questions) {
      const selectedOption = answerMap.get(question.id) ?? -1;
      const isCorrect = selectedOption !== -1 && selectedOption === question.answer;

      analysis.push({
        questionId: question.id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: selectedOption === -1 ? -1 : selectedOption - 1,
        correctOption: question.answer - 1,
        isCorrect,
      });
    }
  }

  return analysis;
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
    .leftJoin(testSections, eq(testResultAnswers.sectionId, testSections.id))
    .leftJoin(
      testSectionQuestions,
      and(
        eq(testSectionQuestions.questionId, testResultAnswers.questionId),
        eq(testSectionQuestions.testSectionId, testSections.id),
      ),
    )
    .where(eq(testResultAnswers.testResultId, resultId))
    .orderBy(asc(testSections.sectionOrder), asc(testSections.createdAt), asc(testSectionQuestions.questionOrder));
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
