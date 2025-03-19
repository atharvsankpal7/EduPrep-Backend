import {app} from "./app";
import dotenv from "dotenv";
import connectTOMongoDB from "./db";

dotenv.config({
    path: "./.env",
});
const port = process.env.PORT || 5000;
connectTOMongoDB().then(() => {
    app.listen(port);

}).catch((err: Error) => {

})