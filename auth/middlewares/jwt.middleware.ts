import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import debug from "debug";

import { Jwt } from "../../common/types/jwt";
import usersServices from "../../users/services/users.services";

const jwtSecret: string = process.env.JWT_SECRET ?? "My!@!Se3cr8tH4sh3";
const log: debug.IDebugger = debug('app:jwt-middleware');

class JwtMiddleware {

    async verifyRefreshBodyField(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const user: any = await usersServices.getUserByEmailWithPassword(
            res.locals.jwt.email
        );
        const salt = crypto.createSecretKey(
            Buffer.from(res.locals.jwt.refreshKey.data)
        );
        const hash = crypto
            .createHmac('sha512', salt)
            .update(res.locals.jwt.userId + jwtSecret)
            .digest('base64');
        if(hash === req.body.refreshToken) {
            req.body = {
                userId: user._id,
                email: user.email,
                permissionFlags: user.permissionFlags,
            };
            return next();
        }else {
            return res.status(400).send({errors: ['Invalid refresh token']});
        }
    }


    async validJWTNeeded(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        if (req.headers['authorization']) {
            try {
                const authorization = req.headers['authorization'].split(' ');
                if (authorization[0] !== 'Bearer') {
                    return res.status(401).send({message:"Unauthorize"});
                } else {
                    res.locals.jwt = jwt.verify(authorization[1], jwtSecret) as Jwt;
                    next();
                }
            } catch (error) {
                log(error)
                return res.status(403).send();
            }
        } else {
            return res.status(401).send();
        }
    }


    async validRefreshNeeded(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const user: any = await usersServices.getUserByEmailWithPassword(
            res.locals.jwt.email
        );
        const salt = crypto.createSecretKey(
            Buffer.from(res.locals.jwt.refreshKey.data)
        );
        const hash = crypto
            .createHmac('sha512', salt)
            .update(res.locals.jwt.userId + jwtSecret)
            .digest('base64');
        if (hash === req.body.refreshToken) {
            req.body = {
                userId: user._id,
                email: user.email,
                permissionFlags: user.permissionFlags,
            };
            return next();
        } else {
            return res.status(400).send({ errors: ['Invalid refresh token'] });
        }
    }
}

export default new JwtMiddleware();