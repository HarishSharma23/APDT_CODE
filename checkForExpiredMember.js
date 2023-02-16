import wixData from 'wix-data';
import { clean_dateText } from 'backend/helpers';
import { triggeredEmails } from 'wix-crm-backend';

export async function findExpiredMembers() {
    let q = wixData.query('member')
        .eq("paidStatus", "EXPIRED")
        .include('privateMemberData', 'role')
    let qRes = await q.eq('emailSentExpired', false)
        .or(q.isEmpty('emailSentExpired'))
        .find({ suppressAuth: true })

    if (qRes?.length > 0) {
        return qRes.items;
    } else {
        return [];
    }
}

export async function sendEmailExpiredMemberEach(itemIn) {
    console.log(`sending email to: ${itemIn.privateMemberData?._id}`);
    // sends to testrh01@wefix.codes for email testing only
    await triggeredEmails.emailMember('SJy3MEh', 'dbde6877-ba0c-4fed-9fb1-9e048f717396', {
        // await triggeredEmails.emailMember('SJy3MEh', itemIn.privateMemberData._id, {
        variables: {
            renewalDate: clean_dateText(itemIn.planExpiredOn),
            todayDate: clean_dateText(new Date()),
            memberNum: itemIn.publicId,
            firstName: itemIn.firstName
        }
    })
}

async function updateSingleExpiredMember(itemIn) {
    try {
        await sendEmailExpiredMemberEach(itemIn);
        // commented out for testing only
        // itemIn.emailSentExpiredToday = true;
        // itemIn.paidStatus = 'EXPIRED';
        // await wixData.save('member', itemIn, { suppressAuth: true })
    } catch (e) {
        console.log(e)
    }
}

export async function sendEmailExpiredMemberBatch() {
    console.log('starting email batch: Expired');
    let memberArray = await findExpiredMembers();
    if (memberArray && memberArray.length > 0) {
        for (let i = 0; i < memberArray.length; i++) {
            await updateSingleExpiredMember(memberArray[i]);
        }
    }
    console.log('ending email batch: Expired');
}