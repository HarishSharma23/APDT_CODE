// Filename: backend/member.jsw (web modules need to have a .jsw extension)
import wixUsers from 'wix-users-backend';
import wixData from 'wix-data';
import { serverError, userError } from "backend/error.js";
import { contacts } from 'wix-crm-backend';
import { triggeredEmails } from 'wix-crm-backend';

export async function getReferee(publicId) {
    let referee_query = await wixData.query('member').eq('publicId', publicId).include('privateMemberData').limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError("Could not find referee at this id", err);
    })
    if (referee_query.totalCount !== 1) {
        throw new serverError("Could not isolate this referee", publicId);
    }
    return referee_query.items[0];
}

// Approves a membership application if current user is member
export async function approve(memberID) {
    let member_query = await wixData.query('member').eq('_id', memberID).include('approval').limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query member collection', err);
    });
    if (member_query.totalCount !== 1) {
        throw new serverError('Could not isolate member at this ID', memberID);
    }
    let member = member_query.items[0];
    console.log("member.privateMemberData");
    console.log(member.privateMemberData);
    member.pendingStatus = 'approved';
    let p1 = wixData.update('member', member, { suppressAuth: true }).catch(err => {
        throw new serverError('Could not update member', err);
    });

    let approval = member.approval;
    let safeString = member.pending.replace(/(^|\/|-)(\S)/g, (_, a, b) => a + b.toUpperCase()).replace('-', '').replace(/^\w/, c => c.toLowerCase());
    approval[safeString] = true;
    let p2 = wixData.update('approval', approval, { suppressAuth: true }).catch(err => {
        throw new serverError('Could not update approval collection', err);
    })

    let plan_slug = member.pending;
    let plan_name = "APDT Member";
    switch (plan_slug) {
    case "accredited-pro":
        plan_name = "Accredited Professional Trainer";
        break;
    case "pro-trainer":
        plan_name = "Professional Dog Trainer";
        break;
    case "volunteer-trainer":
        plan_name = "Volunteer Dog Trainer";
        break;
    case "pet-care-pro":
        plan_name = "Pet Care Professional";
        break;
    case "student":
        plan_name = "Student Membership";
        break;
    case "associate":
        plan_name = "Associate Membership";
        break;
    }

    try {
        // await triggeredEmails.emailMember('SNkey02', 'cada8992-403d-42fc-bb25-3fdb066e9148', {
        //     variables: {
        //         role: plan_name
        //     }
        // })

        await wixUsers.emailUser('SNkey02', member.privateMemberData, {
            variables: {
                role: plan_name
            }
        });
    } catch (err) {
        new serverError("Could not email user with approval status", err);
    }

    await Promise.all([p1, p2]);
    return memberID + ' has been approved';
    //return "mail send";
}

// Rejects a membership application if current user is admin (needs UI)
export async function reject(memberID) {
    console.log(memberID)
    let member_query = await wixData.query('member').eq('_id', memberID).limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query member collection');
    });
    console.log({ member_quer_rejecty: member_query })
    if (member_query.totalCount !== 1) {
        throw new serverError('Could not isolate member at this ID', memberID);
    }
    let member = member_query.items[0];
    member.pendingStatus = 'rejected'
    await wixData.update('member', member, { suppressAuth: true }).catch(err => {
        throw new serverError('Could not update member', err);
    });
    console.log(member.privateMemberData)
    //await wixUsers.emailUser('SNkjMZu', member.privateMemberData);
    return memberID + ' has been rejected';
}

// Returns documentation record for member if current user is admin
export function getDocumentation(documentationId) {
    return wixData.get('documentation', documentationId, { suppressAuth: true });
}

export async function getPending(type, limit, skip, filter) {
    limit = limit ?? 20;
    skip = skip ?? 0;
    let query = wixData.query('member').eq('pendingStatus', 'pending');

    // Add Searchterm
    if (type) {
        query = query.eq('pending', type);
    }

    //builds return variables in upper scope in case of failures
    let response = {
        totalPages: 1,
        currentPage: 1,
        skip: skip,
        limit: limit,
        items: []
    };
    if (filter) {
        console.log('adding filter string');
        query = query.contains('firstName', filter).or(query.contains('lastName', filter));
    } else {
        console.log('no filter string');
    }

    //builds filter, returns data
    let dataOut = await query.include("documentation", "privateMemberData", "approval").descending('_createdDate').skip(skip).limit(limit).find({ suppressAuth: true });
    //assign the data allowed to go through.
    if (dataOut && dataOut.items && dataOut.items.length > 0) {
        //get page count
        response.totalPages = Math.ceil(dataOut.totalCount / limit);
        response.currentPage = Math.ceil(skip / limit) + 1;
        if (response.currentPage)
            response.items = dataOut.items.map(async (item) => {
                if (item.documentation.vdtReferee) {
                    item.documentation.vdtReferee = await wixData.get("member", item.documentation.vdtReferee).catch(() => {
                        return null;
                    })
                }
                if (item.documentation.pdtReferee) {
                    item.documentation.pdtReferee = await wixData.get("member", item.documentation.pdtReferee).catch(() => {
                        return null;
                    })
                }
                return item;
            });
    }

    response.items = await Promise.all(response.items);
    return response;
}

export async function updateLabels(skip) {
    if (!skip) { skip = 0 }
    const memberQuery = await wixData.query("member").include("privateMemberData").skip(skip).limit(100).find({ suppressAuth: true }).catch((err) => {
        return new serverError("Could not query members", err);
    })
    if (memberQuery instanceof Error) return memberQuery;
    const ordersQuery = await wixData.query("orders").eq("status", "Successful").limit(1000).descending("_updatedDate").find({ suppressAuth: true }).catch((err) => {
        return new serverError("Could not query orders", err);
    });
    if (ordersQuery instanceof Error) { return ordersQuery }
    const orders = ordersQuery.items.reduce((o, key) => ({ ...o, [key.member]: key }), {});

    const contactQuery = await contacts.queryContacts().limit(1000).find({ suppressAuth: true }).catch((err) => {
        return new serverError("Failed to query contacts", err);
    })
    if (contactQuery instanceof Error) { return contactQuery }
    const contactsIds = contactQuery.items.reduce((o, key) => ({ ...o, [key.primaryInfo.email]: key._id }), {});

    const contactRecords = []
    for (const member of memberQuery.items) {
        if (member.privateMemberData == null || member.privateMemberData.loginEmail == null ||
            member.privateMemberData.loginEmail.length < 1 || !(member.privateMemberData.loginEmail in contactsIds)) {
            continue;
        }
        if (member._id in orders) {
            let order = orders[member.privateMemberData._id];
            if (order == null) { order = "UNPAID" }
            contactRecords.push({
                member: member,
                order: order,
                contact: contactsIds[member.privateMemberData.loginEmail]
            })
        } else {
            contactRecords.push({
                member: member,
                order: "UNPAID",
                contact: contactsIds[member.privateMemberData.loginEmail]
            })
        }
    }

    const label = await contacts.findOrCreateLabel("No Payments", { suppressAuth: true }).catch(((err) => {
        return new serverError("Failed to get label", err);
    }))
    if (label instanceof Error) { return label }
    console.log(label);
    const labelAssignments = []
    for (const contactRecord of contactRecords) {
        if (contactRecord.order == "UNPAID") {
            labelAssignments.push(contacts.labelContact(contactRecord.contact, [label.label.key], { suppressAuth: true }));
        }
    }
    return Promise.all(labelAssignments).catch((err) => {
        return new serverError("Failed to label contacts", err);
    })
}