import logger from "./logger";
import {rateLimit} from 'express-rate-limit'

const rateLimiter = rateLimit({
    windowMs: 1000,// each minute
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message:
        {message: 'Too many login attempts from this IP, please try again after a 60 second pause'},
    handler: (req , res) => {
        logger.error(`Rate limit exceeded - IP: ${req.ip}, Path: ${req.path}, Method: ${req.method}, User-Agent: ${req.get('user-agent')}`);
        res.status(429).send({message: 'Too many login attempts from this IP, please try again after a 60 second pause'});
    }
})
export default rateLimiter;