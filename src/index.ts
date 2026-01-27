import { app } from "./app";
import dotenv from "dotenv";
import connectToPostgres from "./db";

dotenv.config({
  path: "./.env",
});
const port = process.env.PORT || 5000;
connectToPostgres()
  .then(() => {
    app.listen(port);
    console.log("Server is running on port: ", port);
    console.log("PostgreSQL is connected");
  })
  .catch((err: Error) => {
    console.log("Error connecting to PostgreSQL:", err);
  });
