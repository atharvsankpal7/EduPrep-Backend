import { db } from '../connection';
import { cetDistributions, companySpecificTests, CETDistribution, CompanySpecificTest } from '../schema';
import { eq, sql } from 'drizzle-orm';

// Get CET distribution
export async function getCETDistribution(): Promise<CETDistribution | undefined> {
  const [distribution] = await db.select().from(cetDistributions);
  return distribution;
}

// Create or update CET distribution
export async function upsertCETDistribution(data: CETDistribution['distributions']) {
  const existing = await getCETDistribution();

  if (existing) {
    const [updated] = await db
      .update(cetDistributions)
      .set({ distributions: data, updatedAt: new Date() })
      .where(eq(cetDistributions.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(cetDistributions)
    .values({ distributions: data })
    .returning();
  return created;
}

// Get company-specific test details
export async function getCompanyTestDetails(
  companyName: string
): Promise<CompanySpecificTest | undefined> {
  const [details] = await db
    .select()
    .from(companySpecificTests)
    .where(eq(companySpecificTests.companyName, companyName));
  return details;
}

// Get all company tests
export async function getAllCompanyTests(): Promise<CompanySpecificTest[]> {
  return db.select().from(companySpecificTests);
}

// Create company test
export async function createCompanyTest(data: {
  companyName: string;
  time: number;
  numberOfQuestions: number;
  topicIds: number[];
}): Promise<CompanySpecificTest> {
  const [test] = await db.insert(companySpecificTests).values(data).returning();
  return test;
}

export interface CETDistributionTopicRow {
  subject: string;
  standard: number;
  topicName: string;
  questionCount: number;
  topicId: number;
}

export async function getCETDistributionTopicsWithInference(
  distributionId = 1,
): Promise<CETDistributionTopicRow[]> {
  const result = await db.execute(sql`
    WITH distribution AS (
      SELECT
        (elem->>'topicId')::int AS topic_id,
        (elem->>'questionCount')::int AS question_count
      FROM cet_distributions cd,
           jsonb_array_elements(cd.distributions::jsonb) AS elem
      WHERE cd.id = ${distributionId}
        AND elem ? 'topicId'
        AND elem ? 'questionCount'
        AND (elem->>'questionCount')::int > 0
    ),
    grouped_distribution AS (
      SELECT
        topic_id,
        SUM(question_count)::int AS question_count
      FROM distribution
      GROUP BY topic_id
    ),
    standard_rank AS (
      SELECT
        q.topic_id,
        q.standard,
        COUNT(*)::int AS standard_count,
        ROW_NUMBER() OVER (
          PARTITION BY q.topic_id
          ORDER BY COUNT(*) DESC, q.standard DESC
        ) AS rn
      FROM questions q
      INNER JOIN grouped_distribution gd ON gd.topic_id = q.topic_id
      GROUP BY q.topic_id, q.standard
    ),
    inferred_standard AS (
      SELECT
        topic_id,
        standard
      FROM standard_rank
      WHERE rn = 1
    )
    SELECT
      s.subject_name AS "subject",
      COALESCE(isd.standard, 0)::int AS "standard",
      t.topic_name AS "topicName",
      gd.question_count::int AS "questionCount",
      gd.topic_id::int AS "topicId"
    FROM grouped_distribution gd
    INNER JOIN topics t ON t.id = gd.topic_id
    INNER JOIN subjects s ON s.id = t.subject_id
    LEFT JOIN inferred_standard isd ON isd.topic_id = gd.topic_id
    ORDER BY s.subject_name, COALESCE(isd.standard, 0), t.topic_name;
  `);

  return (result as unknown as { rows: CETDistributionTopicRow[] }).rows;
}
