import wixData from 'wix-data';
import { clean_dateText } from 'backend/helpers';
// import wixUsersBackend from 'wix-users-backend';
import { triggeredEmails } from 'wix-crm-backend';

export async function findStaleMembers() {
    let now = new Date();
    now.setDate(now.getDate() - 90);

    let q = wixData.query('member').lt('planExpiredOn', now);
    let queryRes = await q.eq('emailSentStale90day', false)
        .or(
            q.isEmpty('emailSentStale90day')
        )
        .include('privateMemberData', 'role')
        .find({ suppressAuth: true })

    if (queryRes?.length > 0) {
        return queryRes.items;
    } else {
        return [];
    }
}

export async function sendEmailStaleMemberEach(itemIn) {
    await triggeredEmails.emailMember('SJy3MEh', itemIn.privateMemberData._id, {
        variables: {
            renewalDate: clean_dateText(itemIn.planExpiredOn),
            todayDate: clean_dateText(new Date()),
            memberNum: itemIn.publicId,
            firstName: itemIn.firstName
        }
    })
}

async function updateSingleStaleMember(itemIn) {
    try {
        await sendEmailStaleMemberEach(itemIn);
        itemIn.emailSentStale90day = true;
        itemIn.status = 'expired';
        await wixData.save('member', itemIn, { suppressAuth: true });
    } catch (e) {
        console.log(e)
    }
}

export async function sendEmailStaleMemberBatch() {
    console.log('starting email batch: stale');
    let memberArray = await findStaleMembers();
    if (memberArray && memberArray.length > 0) {
        for (let i = 0; i < memberArray.length; i++) {
            await updateSingleStaleMember(memberArray[i]);
        }
    }
    console.log('ending email batch: stale');
}