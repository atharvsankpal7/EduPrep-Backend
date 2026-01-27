import { db } from '../connection';
import { topics, subjects, domains, Topic, Subject, Domain, NewTopic, NewSubject, NewDomain } from '../schema';
import { eq, inArray, ilike } from 'drizzle-orm';

// Domain helpers
export async function createDomain(data: NewDomain): Promise<Domain> {
  const [domain] = await db.insert(domains).values(data).returning();
  return domain;
}

export async function findDomainById(id: number): Promise<Domain | undefined> {
  const [domain] = await db.select().from(domains).where(eq(domains.id, id));
  return domain;
}

export async function findDomainByName(name: string): Promise<Domain | undefined> {
  const [domain] = await db
    .select()
    .from(domains)
    .where(ilike(domains.domainName, name));
  return domain;
}

export async function getAllDomains(): Promise<Domain[]> {
  return db.select().from(domains);
}

// Subject helpers
export async function createSubject(data: NewSubject): Promise<Subject> {
  const [subject] = await db.insert(subjects).values(data).returning();
  return subject;
}

export async function findSubjectById(id: number): Promise<Subject | undefined> {
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
  return subject;
}

export async function findSubjectByName(name: string): Promise<Subject | undefined> {
  const [subject] = await db
    .select()
    .from(subjects)
    .where(ilike(subjects.subjectName, name));
  return subject;
}

export async function getSubjectsByDomain(domainId: number): Promise<Subject[]> {
  return db.select().from(subjects).where(eq(subjects.domainId, domainId));
}

export async function getAllSubjects(): Promise<Subject[]> {
  return db.select().from(subjects);
}

// Topic helpers
export async function createTopic(data: NewTopic): Promise<Topic> {
  const [topic] = await db.insert(topics).values(data).returning();
  return topic;
}

export async function findTopicById(id: number): Promise<Topic | undefined> {
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  return topic;
}

export async function findTopicByName(name: string): Promise<Topic | undefined> {
  const [topic] = await db.select().from(topics).where(eq(topics.topicName, name));
  return topic;
}

export async function findTopicsByNames(names: string[]): Promise<Topic[]> {
  if (names.length === 0) return [];
  return db.select().from(topics).where(inArray(topics.topicName, names));
}

export async function findTopicsByIds(ids: number[]): Promise<Topic[]> {
  if (ids.length === 0) return [];
  return db.select().from(topics).where(inArray(topics.id, ids));
}

export async function getTopicsBySubject(subjectId: number): Promise<Topic[]> {
  return db.select().from(topics).where(eq(topics.subjectId, subjectId));
}

export async function getAllTopics(): Promise<Topic[]> {
  return db.select().from(topics);
}

// Get topics with subject info
export async function getTopicsWithSubject() {
  return db
    .select({
      id: topics.id,
      topicName: topics.topicName,
      subjectId: subjects.id,
      subjectName: subjects.subjectName,
      domainId: domains.id,
      domainName: domains.domainName,
      educationLevel: domains.educationLevel,
    })
    .from(topics)
    .leftJoin(subjects, eq(topics.subjectId, subjects.id))
    .leftJoin(domains, eq(subjects.domainId, domains.id));
}
