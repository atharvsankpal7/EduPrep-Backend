import { connectToDatabase, closeDatabase } from "./connection";

const connectToPostgres = async () => {
  await connectToDatabase();
};

export default connectToPostgres;
export { connectToDatabase, closeDatabase };
