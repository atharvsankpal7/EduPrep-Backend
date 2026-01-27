import { db } from '../connection';
import { cetDistributions, companySpecificTests, CETDistribution, CompanySpecificTest } from '../schema';
import { eq } from 'drizzle-orm';

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
