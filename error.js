import wixUsersBackend from 'wix-users-backend';
import wixData from 'wix-data';

const genericMessage = "An error has occured, please try again later"

const DEBUG = true;

export class serverError extends Error {
    constructor(message, payload) {
        const userInfo = JSON.stringify(wixUsersBackend.currentUser);
        const payloadInfo = (payload instanceof String) ? JSON.stringify(payload) : payload;
        let report = 'MESSAGE: ' + message + '| USER: ' + userInfo + '| PAYLOAD: ' + payloadInfo;
        super(report);
        wixData.insert("log", { message: message, stack: this.stack }, { suppressAuth: true });
        this.name = "serverError";
        if (DEBUG) {
            this.info = message;
        } else {
            this.info = "A server error has occured, please try again later";
        }
        this.error = true;
    }
}

export class userError extends Error {
    constructor(message, payload) {
        if (message == null) {
            message = genericMessage;
        }
        const userInfo = JSON.stringify(wixUsersBackend.currentUser);
        const payloadInfo = (payload instanceof String) ? JSON.stringify(payload) : payload;
        let report = 'MESSAGE: ' + message + '| USER: ' + userInfo + '| PAYLOAD: ' + payloadInfo;
        super(report);
        this.info = message;
        this.name = "userError";
        this.error = true;
    }
}