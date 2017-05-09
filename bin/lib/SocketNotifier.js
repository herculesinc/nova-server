"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nova_base_1 = require("nova-base");
// NOTIFIER CLASS
// ================================================================================================
class SocketNotifier {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(server, logger) {
        if (!server)
            throw new Error('Cannot create socket notifier: server is undefined');
        this.server = server;
        this.logger = logger;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    send(noticeOrNotices) {
        nova_base_1.validate(noticeOrNotices, 'Cannot send notices: notices are undefined');
        const notices = Array.isArray(noticeOrNotices) ? noticeOrNotices : [noticeOrNotices];
        if (notices.length === 0)
            return Promise.resolve();
        const start = process.hrtime();
        this.logger && this.logger.debug(`Sending (${notices.length}) notices...`);
        for (let notice of notices) {
            if (!notice)
                continue;
            const topic = notice.topic ? notice.topic : '/';
            this.logger && this.logger.debug(`Sending ${topic}:${notice.event} notice to (${notice.target}) target`);
            this.server.of(topic).in(notice.target).emit(notice.event, notice.payload);
        }
        // log the notice sent event
        this.logger && this.logger.log(`Notices Sent`, {
            count: notices.length,
            time: nova_base_1.util.since(start)
        });
        // return success
        return Promise.resolve();
    }
}
exports.SocketNotifier = SocketNotifier;
//# sourceMappingURL=SocketNotifier.js.map