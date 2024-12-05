import  { NextFunction, Request, Response } from "express";

const asyncHandler =
    (fn: Function) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                next(error); // Pass the error to the global error handler
            }
        };

export default asyncHandler;
