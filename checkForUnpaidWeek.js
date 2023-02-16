import wixData from 'wix-data';
import { clean_dateText } from 'backend/helpers';
import { triggeredEmails } from 'wix-crm-backend';

export async function findRemindMemberWeekMembers() {

    let end = new Date();
    end.setDate(end.getDate() + 7);
    let start = new Date();

    let q = wixData.query('memberTest')
        .le('planExpiredOn', end)
        .gt('planExpiredOn', start)

    let queryRes = await q.eq('emailSent7Day', false)
        .or(
            q.isEmpty('emailSent7Day')
        )
        .include('privateMemberData', 'role')
        .find({ suppressAuth: true })
    console.log({ findRemindMemberWeekMembers: queryRes });

    if (queryRes?.length > 0) {
        return queryRes.items;
    }
}

export async function sendEmailRemindMemberWeekEach(itemIn) {
    console.log(`sending email to: ${itemIn.privateMemberData?._id}`);
    await triggeredEmails.emailMember('SJxyEnx', itemIn.privateMemberData._id, {
        variables: {
            renewalDate: clean_dateText(itemIn.planExpiredOn),
            todayDate: clean_dateText(new Date()),
            memberNum: itemIn.publicId,
            firstName: itemIn.firstName
        }
    });
    console.log('email sent to =>', itemIn.privateMemberData)
}

export async function sendEmailRemindMemberWeekBatch() {
    console.log('starting email batch: week reminder');
    let memberArray = await findRemindMemberWeekMembers();
    if (memberArray && memberArray.length > 0) {
        for (let i = 0; i < memberArray.length; i++) {
            let curMem = memberArray[i];
            try {
                await sendEmailRemindMemberWeekEach(curMem);
                curMem.emailSent7Day = true;
                await wixData.save('memberTest', curMem, { suppressAuth: true })
            } catch (e) {
                console.log(e)
            }
        }
    }
    console.log('ending email batch: week reminder');
}