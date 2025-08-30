import crypto from "crypto";

const secretKey: any = process.env.CSRF_SECRET_KEY;

export const generateCsrfToken = () => {
    const token = crypto.randomBytes(32).toString('hex'); // Random token
    const signature = crypto.createHmac('sha256', secretKey).update(token).digest('hex');

    return { token, signature };
};


export const verifyCsrfToken = (token: string, signature: string, bodyToken: string) => {

    const validSignature = crypto.createHmac('sha256', secretKey).update(token).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(validSignature)) && token === bodyToken;
};

/**
 * Default Value function, checking req.body
 * and req.query for the csrf token
 *
 * @param {*} req
 * @return {String} csrf token
 */

export const defaultValue = (req: any): string => {

    return (req.body && req.body._csrf) ||
        (req.body && req.body.csrf_token) ||
        (req.headers && req.headers['csrf_token']) ||
        (req.headers && req.headers['csrf-token']) ||
        (req.headers && req.headers['xsrf-token']) ||
        (req.headers && req.headers['x-csrf-token']) ||
        (req.headers && req.headers['x-xsrf-token']);
};