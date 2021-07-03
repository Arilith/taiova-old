import * as fs from 'fs';

export const privateKey = fs.readFileSync("./cert/key.key").toString();
export const certificate = fs.readFileSync("./cert/cert.crt").toString();
export const ca = fs.readFileSync("./cert/key-ca.crt").toString();