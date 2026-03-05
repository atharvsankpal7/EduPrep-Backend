import { db } from "../connection";
import { sql } from "drizzle-orm";
import type { TestHistoryQuery } from "../../ZodSchema/testHistorySchema";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface TestHistoryRow {
  id: string;
  resultId: string;
  testName: string;
  testType: string;
  attemptedAt: string;
  topics: string[];
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  maxMarks: number;
  marksObtained: number;
  timeTaken: number;
  totalDuration: number;
  status: string;
  educationLevel: string;
}

export interface TestHistoryResult {
  tests: TestHistoryRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// The single query — everything in SQL, zero app-layer logic
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the student's test history with filtering, sorting, pagination, and
 * topic aggregation — all in one SQL query using CTEs.
 *
 * Test type is derived from the test_name convention used at creation time.
 * Topics are aggregated via a lateral join to avoid N+1 queries.
 * Total count for pagination rides alongside via CROSS JOIN on a counting CTE.
 */
export async function getStudentTestHistoryDashboard(
  studentId: number,
  params: TestHistoryQuery,
): Promise<TestHistoryResult> {
  const { page, limit, testType, search, sortBy, sortOrder } = params;
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clauses using safe parameterization
  // We always filter by student_id; testType and search are optional
  const testTypeFilter = testType
    ? sql`AND (
        CASE
          WHEN lower(t.test_name) LIKE 'cet test%' THEN 'cet'
          ELSE 'custom'
        END
      ) = ${testType}`
    : sql``;

  const searchPattern = search ? `%${search}%` : null;
  const searchFilter = searchPattern
    ? sql`AND (
        t.test_name ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1
          FROM test_sections ts_s
          JOIN test_section_questions tsq_s ON tsq_s.test_section_id = ts_s.id
          JOIN questions q_s               ON q_s.id = tsq_s.question_id
          JOIN topics tp_s                 ON tp_s.id = q_s.topic_id
          WHERE ts_s.test_id = t.id
            AND tp_s.topic_name ILIKE ${searchPattern}
        )
      )`
    : sql``;

  // Sort — we use a CASE to map the validated sortBy enum to actual columns.
  // The enum is already validated by Zod, so this is safe.
  // The outer SELECT is from `base b`, so ORDER BY must use `b.*` aliases.
  const orderClause =
    sortBy === "score"
      ? sortOrder === "asc"
        ? sql`ORDER BY b.score_pct ASC, b.attempted_at DESC`
        : sql`ORDER BY b.score_pct DESC, b.attempted_at DESC`
      : sortBy === "timeTaken"
        ? sortOrder === "asc"
          ? sql`ORDER BY b.time_taken ASC, b.attempted_at DESC`
          : sql`ORDER BY b.time_taken DESC, b.attempted_at DESC`
        : sortOrder === "asc"
          ? sql`ORDER BY b.attempted_at ASC`
          : sql`ORDER BY b.attempted_at DESC`;

  const result = await db.execute(sql`
    WITH topic_agg AS (
      SELECT
        ts.test_id,
        ARRAY_AGG(DISTINCT tp.topic_name) FILTER (WHERE tp.topic_name IS NOT NULL) AS topics,
        MAX(d.education_level) AS education_level
      FROM test_sections ts
      JOIN test_section_questions tsq ON tsq.test_section_id = ts.id
      JOIN questions q               ON q.id = tsq.question_id
      JOIN topics tp                 ON tp.id = q.topic_id
      JOIN subjects sub              ON sub.id = tp.subject_id
      JOIN domains d                 ON d.id = sub.domain_id
      GROUP BY ts.test_id
    ),
    base AS (
      SELECT
        tr.id                                         AS result_id,
        t.id                                          AS test_id,
        t.test_name,
        CASE
          WHEN lower(t.test_name) LIKE 'cet test%' THEN 'cet'
          ELSE 'custom'
        END                                           AS test_type,
        tr.created_at                                 AS attempted_at,
        COALESCE(ta.topics, ARRAY[]::varchar[])       AS topics,
        t.total_questions,
        tr.score                                      AS correct_answers,
        CASE
          WHEN t.total_questions > 0
          THEN ROUND((tr.score::numeric / t.total_questions) * 100, 1)
          ELSE 0
        END                                           AS score_pct,
        t.total_questions                             AS max_marks,
        tr.score                                      AS marks_obtained,
        tr.time_taken,
        t.total_duration,
        CASE
          WHEN tr.is_auto_submitted THEN 'auto_submitted'
          ELSE 'completed'
        END                                           AS status,
        COALESCE(ta.education_level, 'unknown')       AS education_level
      FROM test_results tr
      JOIN tests t         ON t.id = tr.test_id
      LEFT JOIN topic_agg ta ON ta.test_id = t.id
      WHERE tr.student_id = ${studentId}
        ${testTypeFilter}
        ${searchFilter}
    ),
    counted AS (
      SELECT COUNT(*)::int AS total FROM base
    )
    SELECT
      b.test_id           AS "id",
      b.result_id         AS "resultId",
      b.test_name         AS "testName",
      b.test_type         AS "testType",
      b.attempted_at      AS "attemptedAt",
      b.topics            AS "topics",
      b.total_questions   AS "totalQuestions",
      b.correct_answers   AS "correctAnswers",
      b.score_pct         AS "score",
      b.max_marks         AS "maxMarks",
      b.marks_obtained    AS "marksObtained",
      b.time_taken        AS "timeTaken",
      b.total_duration    AS "totalDuration",
      b.status            AS "status",
      b.education_level   AS "educationLevel",
      c.total             AS "total"
    FROM base b
    CROSS JOIN counted c
    ${orderClause}
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const rows = (result as unknown as { rows: (TestHistoryRow & { total: number })[] }).rows;

  const total = rows.length > 0 ? rows[0].total : 0;
  const tests: TestHistoryRow[] = rows.map(({ total: _, ...rest }) => rest);

  return {
    tests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
