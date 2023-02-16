import wixData from 'wix-data';
import { sendEmailStaleMemberBatch } from "backend/checkForEmails/checkForStaleMember";
import { sendEmailRemindMemberMonthBatch } from "backend/checkForEmails/checkForUnpaidMonth";
import { sendEmailRemindMemberWeekBatch } from "backend/checkForEmails/checkForUnpaidWeek";

export async function cycleRequiredChecks() {
    let toLog = {
        startTime: new Date(),
        function: 'checkForEmailsCycle/cycleRequiredChecks',
        status: 'started'
    }
    let saved = await wixData.save('logJobs', toLog, { suppressAuth: true });
    // return;
    try {
        // await sendEmailStaleMemberBatch();
        // await sendEmailRemindMemberMonthBatch();
        // await sendEmailRemindMemberWeekBatch();
        saved.status = 'complete';
        await wixData.save('logJobs', saved, { suppressAuth: true });
    } catch (err) {
		console.log(err);
        saved.status = 'error';
        saved.err = err;
        await wixData.save('logJobs', saved, { suppressAuth: true });
    }
}