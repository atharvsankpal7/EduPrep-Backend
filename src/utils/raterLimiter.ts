import logger from "./logger";
import {rateLimit} from 'express-rate-limit'

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // Limit each IP to 100 requests per 1 minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: 'Too many requests from this IP, please try again after 1 minute'},
    handler: (req , res) => {
        logger.error(`Global Rate limit exceeded - IP: ${req.ip}, Path: ${req.path}, Method: ${req.method}, User-Agent: ${req.get('user-agent')}`);
        res.status(429).send({message: 'Too many requests from this IP, please try again after 1 minute'});
    }
});

export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 5, // Limit each IP to 5 login/register attempts per 1 minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: 'Too many login attempts from this IP, please try again after 1 minute'},
    handler: (req , res) => {
        logger.error(`Auth Rate limit exceeded - IP: ${req.ip}, Path: ${req.path}, Method: ${req.method}, User-Agent: ${req.get('user-agent')}`);
        res.status(429).send({message: 'Too many login attempts from this IP, please try again after 1 minute'});
    }
});

export default globalLimiter;
