import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import { connectToDatabase, closeDatabase } from "../db/connection";
import {
  createDomain,
  createSubject,
  createTopic,
  findDomainByName,
  findSubjectByName,
  findTopicByName,
} from "../db/helpers/topic.helpers";
import { createQuestions } from "../db/helpers/question.helpers";
import { upsertCETDistribution, createCompanyTest } from "../db/helpers/distribution.helpers";
import { createUserRaw, findUserByEmail } from "../db/helpers/user.helpers";

dotenv.config({ path: "./.env" });

type MongoId = mongoose.Types.ObjectId;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function migrateMongoToPostgres() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(mongoUri);
  await connectToDatabase();

  const db = mongoose.connection.db;
  if(!db){
    throw new Error("DB is not connected");
  }

  const domainCollection = db.collection("domains");
  const subjectCollection = db.collection("subjects");
  const topicCollection = db.collection("topics");
  const questionCollection = db.collection("questions");
  const userCollection = db.collection("users");
  const cetDistributionCollection = db.collection("cetdistributions");
  const companySpecificCollection = db.collection("companyspecifictestdetails");

  try {
    const domains = await domainCollection.find({}).toArray();
    const subjects = await subjectCollection.find({}).toArray();
    const topics = await topicCollection.find({}).toArray();
    const questions = await questionCollection.find({}).toArray();
    const users = await userCollection.find({}).toArray();
    const cetDistributions = await cetDistributionCollection.find({}).toArray();
    const companySpecificTests = await companySpecificCollection.find({}).toArray();

    const domainIdMap = new Map<string, number>();
    const subjectIdMap = new Map<string, number>();
    const topicIdMap = new Map<string, number>();

    for (const domain of domains) {
      const domainName = String(domain.domainName || "").toLowerCase();
      if (!domainName) continue;
      const existing = await findDomainByName(domainName);
      const created = existing
        ? existing
        : await createDomain({
            domainName,
            educationLevel: domain.educationLevel || "",
          });
      domainIdMap.set(domain._id.toString(), created.id);
    }

    for (const subject of subjects) {
      const domainId = domainIdMap.get(subject.domainId?.toString());
      if (!domainId) {
        logger.warn(`Skipping subject with missing domain: ${subject.subjectName}`);
        continue;
      }
      const subjectName = String(subject.subjectName || "").toLowerCase();
      if (!subjectName) continue;
      const existing = await findSubjectByName(subjectName);
      const created = existing
        ? existing
        : await createSubject({
            subjectName,
            domainId,
          });
      subjectIdMap.set(subject._id.toString(), created.id);
    }

    for (const topic of topics) {
      const subjectId = subjectIdMap.get(topic.subjectId?.toString());
      if (!subjectId) {
        logger.warn(`Skipping topic with missing subject: ${topic.topicName}`);
        continue;
      }
      const topicName = String(topic.topicName || "").toLowerCase();
      if (!topicName) continue;
      const existing = await findTopicByName(topicName);
      const created = existing
        ? existing
        : await createTopic({
            topicName,
            subjectId,
          });
      if (existing && existing.subjectId !== subjectId) {
        logger.warn(
          `Topic "${topicName}" already exists under another subject; reusing existing topic id`
        );
      }
      topicIdMap.set(topic._id.toString(), created.id);
    }

  const questionsToCreate: {
    topicId: number;
    questionText: string;
    options: string[];
    answer: number;
    difficultyLevel: "easy" | "medium" | "hard" | null;
    explanation: string | null;
    standard: number;
  }[] = [];
    for (const question of questions) {
      const topicId = topicIdMap.get(question.topicId?.toString());
      if (!topicId) {
        logger.warn(`Skipping question with missing topic: ${question.questionText}`);
        continue;
      }
      const rawDifficulty = String(question.difficultyLevel || "").toLowerCase();
      const difficulty =
        rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
          ? rawDifficulty
          : null;

      questionsToCreate.push({
        topicId,
        questionText: question.questionText,
        options: question.options,
        answer: question.answer,
        difficultyLevel: difficulty,
        explanation: question.explanation ?? null,
        standard: question.standard ?? 0,
      });
    }
    if (questionsToCreate.length > 0) {
      const batches = chunkArray(questionsToCreate, 100);
      for (const batch of batches) {
        await createQuestions(batch);
      }
    }

    for (const user of users) {
      const email = String(user.email || "").toLowerCase();
      if (!email) continue;
      const existing = await findUserByEmail(email);
      if (existing) continue;
      await createUserRaw({
        email,
        fullName: user.fullName || "User",
        password: user.password,
        refreshToken: user.refreshToken ?? null,
        role: user.role ?? "student",
      });
    }

    if (cetDistributions.length > 0) {
      const distribution = cetDistributions[0];
      const mappedDistributions = distribution.distributions.map((dist: any) => ({
        subject: dist.subject,
        standard: dist.standard,
        topics: dist.topics.map((topic: any) => {
          const mappedTopicId = topicIdMap.get(topic.topicId?.toString());
          return {
            topicId: mappedTopicId ?? 0,
            topicName: topic.topicName,
            questionCount: topic.questionCount,
            marksPerQuestion: topic.marksPerQuestion,
          };
        }),
      }));
      await upsertCETDistribution(mappedDistributions);
    }

    for (const companyTest of companySpecificTests) {
      const mappedTopicIds = (companyTest.topicList || [])
        .map((id: MongoId) => topicIdMap.get(id.toString()))
        .filter((id: number | undefined) => typeof id === "number") as number[];

      await createCompanyTest({
        companyName: companyTest.companyName,
        time: companyTest.time,
        numberOfQuestions: companyTest.numberOfQuestions,
        topicIds: mappedTopicIds,
      });
    }

    logger.info("MongoDB to PostgreSQL migration completed");
  } finally {
    await mongoose.disconnect();
    await closeDatabase();
  }
}

migrateMongoToPostgres().catch((error) => {
  logger.error("Migration failed:", error);
  process.exit(1);
});
