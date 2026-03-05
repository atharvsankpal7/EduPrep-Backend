class ApiError<T = unknown> extends Error {
    statusCode: number;
    data: null;
    success: boolean;
    errors: T[];

    constructor(
        statusCode: number,
        message: string = "Something went wrong",
        errors: T[] = [],
        stack: string = ""
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = statusCode < 400;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError }