import  { NextFunction, Request, Response } from "express";

const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                next(error); // Pass the error to the global error handler
            }
        };

export default asyncHandler;
