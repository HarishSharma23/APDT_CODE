import wixData from 'wix-data';
import { clean_dateText } from 'backend/helpers';
// import wixUsersBackend from 'wix-users-backend';
import { triggeredEmails } from 'wix-crm-backend';

export async function findRemindMonthMembers() {
    let dataOut = [];
    let start = new Date();
    start.setDate(start.getDate() + 30);
    let end = new Date();
    end.setDate(end.getDate() + 8)
    let q = wixData.query('memberTest')
        .le('planExpiredOn', start)
        .gt('planExpiredOn', end)
    let queryRes = await q.eq('emailSent30Day', false)
        .or(
            q.isEmpty('emailSent30Day')
        )
        .include('privateMemberData', 'role')
        .find({ suppressAuth: true })
    console.log({ findRemindMonthMembers: queryRes });

    if (queryRes?.length > 0) {
        return queryRes.items;
    }
}

export async function sendEmailRemindMemberMonthEach(itemIn) {
    // await wixUsersBackend.emailUser('SJxvzuU', itemIn.privateMemberData._id, {
    await triggeredEmails.emailMember('SJxvzuU', itemIn.privateMemberData._id, {
        variables: {
            renewalDate: clean_dateText(itemIn.planExpiredOn),
            todayDate: clean_dateText(new Date()),
            memberNum: itemIn.publicId,
            firstName: itemIn.firstName
        }
    });
}

export async function sendEmailRemindMemberMonthBatch() {
    console.log('starting email batch: month reminder');
    let memberArray = await findRemindMonthMembers();
    if (memberArray && memberArray.length > 0) {
        memberArray.forEach(async (item) => {
            try {
                await sendEmailRemindMemberMonthEach(item);
                item.emailSent30Day = true;
                await wixData.save('memberTest', item, { suppressAuth: true })
            } catch (e) {
                console.log(e)
            }
        })
    }
    console.log('ending email batch: month reminder');
}

