// Filename: backend/member.jsw (web modules need to have a .jsw extension)
import wixUsers from 'wix-users-backend';
import Hashids from 'hashids';
import wixData from 'wix-data';
import jwt from 'jsonwebtoken';
import { getSecret } from 'wix-secrets-backend'
import { serverError, userError } from "backend/error.js";
const hashids = new Hashids('Australian Pet Dog Trainers', 10);
const websiteLocation = "https://www.apdt.org.au/";
import { contacts } from 'wix-crm-backend';
import { roles } from 'wix-users-backend';
import { authentication } from 'wix-members-backend';
import wixPayBackend from 'wix-pay-backend';
import { triggeredEmails } from 'wix-crm-backend';
import wixMembersBackend from 'wix-members-backend';
//import { currentMember } from 'wix-members-backend';

//returns basic member information
async function rawMember() {
    const currentUser = wixUsers.currentUser;
    if (!currentUser.loggedIn) {
        return false;
    }
    let member_query = await wixData.query('member').eq('privateMemberData', currentUser.id).limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query members');
    })
    if (member_query.totalCount !== 1) {
        throw new userError('Could not find a member at this wixId - rawMember');
    }
    return member_query.items[0];
}

// Creates lodges application for member (inc. docs and approval)
export async function createApplication(slug, address, options) {
    console.log("createApplication called");
    let currentUser = wixUsers.currentUser;
    //This is redundent for page access
    if (!currentUser.loggedIn) {
        throw new serverError('No member logged in');
    }

    console.log({ "slug": slug, "address": address, "options": options, "currentUser": currentUser });
    let member_query = await wixData.query('member').eq('privateMemberData', currentUser.id).include('documentation').limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query member table');
    })

    //handler to manage "deleted" rows from member table. Rows will be incomplete, and will require additional updates such as isolating approvals
    //console.log(member_query)
    if (member_query && member_query.items && member_query.items.length === 0) {
        let fixMember = await wixData.get("Members/PrivateMembersData", currentUser.id, { suppressAuth: true });
        console.log(fixMember)
    }

    if (member_query.totalCount !== 1) {
        throw new serverError('Could not isolate a member for this wixId');
    }

    let member = member_query.items[0];
    let docs_record;
    let docs_new;

    // Find existing docs record
    if (member.documentation !== undefined) {
        docs_record = member.documentation;
        docs_new = false;
    } else {
        docs_record = {
            'title': member.publicId
        }
        docs_new = true;
    }

    //  Fill docs record based on options
    for (var prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
            docs_record[prop] = options[prop];
        }
    }

    if (docs_new) {
        docs_record = await wixData.insert('documentation', docs_record, { suppressAuth: true }).catch((err) => {
            throw new serverError('Could not save documentation record');
        });
    } else {
        await wixData.update('documentation', docs_record, { suppressAuth: true }).catch((err) => {
            throw new serverError('could not update documentation record');
        });
    }

    // Update member address + docs + pending
    member.address = address;
    member.documentation = docs_record._id;
    member.pending = slug;
    member.applicationDate = new Date();
    member.pendingStatus = "pending";

    /*

    // Send triggered email to referee 
    // Added check for options existing. Client changed requirements so that these require no options: Pet Care Pro
    if (options && options['pdtReferee'] !== undefined) {
        member.referee = options.pdtReferee;
        await askReferee(member._id, options.pdtReferee).then(() => {}).catch(() => {});
    }

    if (options && options['vdtReferee'] !== undefined) {
        member.referee = options.vdtReferee;
        await askReferee(member._id, options.vdtReferee).then(() => {}).catch(() => {});
    }
    */

    await wixData.update('member', member, { suppressAuth: true }).catch(err => {
        throw new serverError('Could not update member record');
    });

    // set click email default preference 
    const contactId = await getMemberContactId()
    await contacts.labelContact(contactId, ["custom.click-e-copy"], { suppressAuth: true }).catch((err) => {
        new serverError('Could not set default click magazine preference', err);
    })
    return 'Created Application Succesfully';
}

// Shows member details to referee member who has their token
export async function showMember(token) {
    let secret = await getSecret('jwt');
    let memberId = null;
    try {
        memberId = jwt.verify(token, secret).id;
    } catch (err) {
        throw new serverError("Invalid Token", token);
    }
    console.log(`memberId: ${memberId}`);

    // Name email address type
    try {
        let member = await getMember(memberId);
        return {
            'firstName': member.firstName,
            'lastName': member.lastName,
            'email': member.email,
            'address': member.address,
            'type': member.pending
        }
    } catch (err) {
        return new serverError("Invalid Member", err);
    }
}

// Returns the ID of a plan if the current user is approved to purchase it
export async function getPlanID(slug) {
    let plan_query_promise = wixData.query("PaidPlans/Plans").eq('slug', slug).limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query paid plans', err);
    })
    console.log('made it here: 01')
    let member = await getCurrentMember();
    console.log({ "member": member })
    let safeString = slug.replace(/(^|\/|-)(\S)/g, (_, a, b) => a + b.toUpperCase()).replace('-', '').replace(/^\w/, c => c.toLowerCase());
    if (!member.approval[safeString]) {
        throw new serverError('Not Authorised', member._id);
    }
    let plan_query = await plan_query_promise;
    console.log({ "plan": plan_query })
    console.log('made it here: 02')
    if (plan_query.totalCount !== 1) {
        throw new serverError('Could not isolate plan at this slug')
    }
    return plan_query.items[0]._id;
}

// Allows user to purchase a membership role if they are approved
export async function orderRole(slug) {
    console.log("you reach orderRole");
    if (!slug) {
        throw ''
    }
    // Find role
    let role;
    try {
        const roleQuery = await wixData.query("MemberRoles").eq("slug", slug).find({ suppressAuth: true });

        console.log('order 7878');
        console.log(roleQuery);
        if (roleQuery.totalCount == 0) {
            return new userError("No role exists with this slug", slug);
        } else if (roleQuery.totalCount > 1) {
            return new serverError("Multiple roles exist with the same slug", slug);
        }
        role = roleQuery.items[0];
    } catch (err) {
        return new serverError("Could not query roles collection", err);
    }

    // Check if member is authorised for this role
    let safeString = slug.replace(/(^|\/|-)(\S)/g, (_, a, b) => a + b.toUpperCase()).replace('-', '').replace(/^\w/, c => c.toLowerCase());
    console.log('safeString');
    console.log(safeString);
    let member = await getCurrentMember();
    console.log('member.approval[safeString]' + member);
    if (!member.approval[safeString]) {
        throw new userError('Current member is not authorised to purchase this role', member._id);
    }

    //Create payment object
    let payment;
    try {
        payment = await wixPayBackend.createPayment({
            items: [{
                name: role.title,
                price: role.price,
            }],
            amount: role.price,
            userInfo: {
                "firstName": member.firstName,
                "lastName": member.lastName,
                "email": member.email,
                "phone": null,
                "countryCode": "AUS"
            }
        });
    } catch (err) {
        throw new serverError("Could not create payment for role", err);
    }
    console.log('orderRole - member', member);

    console.log(payment.id)

    // Record the details of the order
    const order = {
        "_id": payment.id,
        "role": role._id,
        "member": member.memberId,
        "status": "Created",
        "amount": payment.amount
    }
    try {
        await wixData.insert("orders", order, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not create order for role purchase", err);
    }

    return payment.id;
}

// Update order via event and assign roles
export async function updateOrder(event) {

    let order;
    // await wixData.query('orders').find({ suppressAuth: true });
    try {
        let id = event.payment.id;
        // let id = "54d3d748-c95a-4e85-8fb2-44e3710e9b7f";
        let query = await wixData.query("orders").include("role").eq("_id", id).find({ suppressAuth: true });
        order = query.items[0];
        //return order;
        var roleId = order.role._id;
        console.log(roleId);
        //order = await wixData.get("orders", event.payment.id, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not get order in event", err);
    }
    // console.log("order" + order);

    order.status = event.status;
    order.transactionId = event.transactionId;

    try {
        order.status = event.status;
        order.transactionId = event.transactionId;
        await wixData.update("orders", order, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not update order record", err);
    }

    if (order.status != "Successful" && order.status != "Offline") {
        //console.log(order.status);
    }

    // Update member and assign role
    let member;
    try {
        member = await wixData.get("member", order.member, { suppressAuth: true });

    } catch (err) {
        return new serverError("Could not get member for order", err);
    }

    // logic to figure out new expiration date
    let expiry;

    if (member.planExpiredOn) {
        expiry = member.planExpiredOn;
        //console.log("expiryold");
        //expiryNew = planstart;
    } else {
        expiry = new Date();
        //console.log("planstart");
        //expiryOld= member.planExpiredOn;
    }

    // console.log(expiryNew);
    // expiryOld = member.planExpiredOn;
    // let expiry;
    // if (!expiryOld || expiryOld > expiryNew) {
    //     expiry = new Date(expiryOld);
    // } else {
    //     expiry = new Date(expiryNew);
    // }

    // add one year to determined expiration
    expiry.setFullYear(expiry.getFullYear() + 1);
    member.paidStatus = "ACTIVE";
    member.emailSent7Day = false;
    member.emailSent30Day = false;
    member.emailSentStale90day = false;
    member.emailSentExpired = false;
    member.planExpiredOn = expiry;
    member.role = roleId;
    member.lastPlanStart = new Date();
    console.log(order.role);

    // remove pending if new member
    if (member.pendingStatus) { delete member.pendingStatus }
    if (member.pending) { delete member.pending }

    console.log(member);
    //Update stuff
    try {
        await wixData.update("member", member, { suppressAuth: true });

    } catch (err) {
        return new serverError("Could not update member with order status", err);
    }
    try {
        await roles.assignRole(order.role, member.privateMemberData, { suppressAuth: true })
        await addRoleLabel(member);
    } catch (err) {
        return new serverError("Could not update member with order status", err);
    }
    const privateData = await wixData.get("Members/PrivateMembersData", member.privateMemberData, { suppressAuth: true }).catch((err) => {
        return new serverError("Failed to get member private data", err);
    })
    if (privateData instanceof Error) { return privateData }
    const contactQuery = await contacts.queryContacts().eq("primaryInfo.email", privateData.loginEmail).find({ suppressAuth: true }).catch((err) => {
        return new serverError("Failed to query contacts to update label", err);
    })
    if (contactQuery instanceof Error) return contactQuery;
    if (contactQuery.items != null && contactQuery.items.length > 0) {
        const contactId = contactQuery.items[0]._id;
        const label = await contacts.findOrCreateLabel("No Payments", { suppressAuth: true }).catch(((err) => {
            return new serverError("Failed to get label", err);
        }))
        if (label instanceof Error) { return label }
        const result = await contacts.unlabelContact(contactId, [label.label.key], { suppressAuth: true }).catch((err) => {
            return new serverError("Failed to remove label", err);
        })
        if (result instanceof Error) { return result }
    }
    return "sucess";
}

async function addRoleLabel(member) {
    try {
        const role = await wixData.get("MemberRoles", member.role, { suppressAuth: true });
        const label = await contacts.findOrCreateLabel(role.title, { suppressAuth: true })
        contacts.labelContact(member.privateMemberData, [label.label.key], { suppressAuth: true })
    } catch (err) {
        return new serverError("Could not add role label to member contact", err);
    }
    return "Success"
}

async function removeRoleLabel(member) {
    try {
        if (!member.role) {
            return "No role to remove";
        }
        const role = await wixData.get("MemberRoles", member.role, { suppressAuth: true });
        const label = await contacts.findOrCreateLabel(role.title, { suppressAuth: true })
        contacts.labelContact(member.privateMemberData, [label.label.key], { suppressAuth: true })
    } catch (err) {
        return new serverError("Could not remove role label to member contact", err);
    }
    return "Success"
}

// Remove expired roles
export async function checkRoles() {
    let expired;
    try {
        const expiredQuery = await wixData.query("member").lt("planExpiredOn", new Date()).eq("paidStatus", "ACTIVE").limit(1000).find({ suppressAuth: true });
        if (expiredQuery.totalCount > 0) {
            expired = expiredQuery.items;
        } else {
            expired = [];
        }
    } catch (err) {
        return new serverError("Could not query members for expired members", err);
    }

    let promises = []
    for (let member of expired) {
        promises.push(roles.removeRole(member.role, member.privateMemberData, { suppressAuth: true }));
        promises.push(removeRoleLabel(member))
    }

    let errors = []
    for (let i = 0; i < expired.length; i++) {
        try {
            await promises[i];
            expired[i].paidStatus = "EXPIRED";
            // delete expired[i].role;
        } catch (err) {
            errors.push(new serverError("Could not remove role for user", expired[i]._id));
        }
    }

    try {
        await wixData.bulkUpdate("member", expired, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not update expired members records", err);
    }

    if (errors.length > 0) {
        return new userError("Failed to remove roles from one or more members")
    }
    return "Success";
}

export async function changeRole(memberId, roleId) {
    let member;
    try {
        member = await wixData.get("member", memberId, { suppressAuth: true });
    } catch (err) {
        return new userError(`Could not fetch a user at ID ${memberId}`, err);
    }
    let desiredRole;
    try {
        if (roleId === "no-role") {
            desiredRole = null;
        } else {
            desiredRole = await wixData.get("MemberRoles", roleId, { suppressAuth: true })
        }
    } catch (err) {
        return new userError(`Could not retreive role at this ID ${roleId}`, err);
    }

    // Remove current role
    if (member.role) {
        try {
            await roles.removeRole(member.role, member.privateMemberData, { suppressAuth: true });
            removeRoleLabel(member)
        } catch (err) {
            return new serverError("Could not remove exisiting role", err);
        }
    }

    // Set new role
    try {
        if (desiredRole) {
            await roles.assignRole(desiredRole._id, member.privateMemberData, { suppressAuth: true });
            member.role = desiredRole._id;
            addRoleLabel(member.role);
            if (member.pending) { delete member.pending }
            if (member.pendingStatus) { delete member.pendingStatus }
        } else {
            // why would we delete  the current role if no desiredRole is returned?
            // delete member.role;
        }
        await wixData.update("member", member, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not assign desired role", err);
    }
    // add role label
    return "Success"
}

export async function cancel() {
    const currentUser = wixUsers.currentUser;
    const rolesPromise = currentUser.getRoles();
    if (!currentUser.loggedIn) {
        return new userError('No member logged in');
    }
    let memberQuery;
    try {
        memberQuery = await wixData.query('member').eq('privateMemberData', currentUser.id).limit(1).include('privateMemberData', 'approval', 'documentation').find({ suppressAuth: true });
    } catch (err) {
        return new serverError("Could not query members", err);
    }
    let member = memberQuery.items[0];
    const allRoles = await rolesPromise;

    // Remove current role
    if (member.role && allRoles.length > 0) {
        try {
            await roles.removeRole(member.role, member.privateMemberData._id, { suppressAuth: true });
            removeRoleLabel(member);
        } catch (err) {
            return new serverError("Could not remove exisiting role", err);
        }
    }

    // update member record
    try {
        delete member.role;
        if (member.pending) { delete member.pending }
        if (member.pendingStatus) { delete member.pendingStatus }
        await wixData.update("member", member, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not remove role from database", err);
    }
    return "Success";
}

export async function currentStatus() {
    let me = await wixMembersBackend.currentMember.getMember();
    if (me?._id) {
        try {
            let qres = await wixData.query('member').eq('privateMemberData', me._id).include('role').find({ suppressAuth: true, suppressHooks: false });
            if (qres.items[0]?.paidStatus) {
                let item = JSON.parse(JSON.stringify(qres.items[0]))
                let dataOut = {
                    paidStatus: item.paidStatus,
                    roleSlug: item.role?.slug
                }
                return dataOut;
                // return qres.items[0]; //?.paidStatus;
            }
        } catch (error) {
            console.log(error);
        }
    }
}

// Returns false or (approved/rejected + slug)
export async function isPending() {
    let member = await rawMember();
    if (member.pending === undefined ||
        member.pendingStatus === "active" ||
        member.pendingStatus === "pending") {
        return false;
    }
    return {
        'status': member.pendingStatus,
        'slug': member.pending
    }
}

// Creates member object and ID for member -> returns session token for newly created user
export async function register(userInfo) {
    // Create wix member
    const registrationResult = await authentication.register(userInfo.email, userInfo.password, { 'contactInfo': { 'firstName': userInfo.firstName, 'lastName': userInfo.lastName, "phones": [userInfo.phone] } }).catch((err) => {
        if (err.message && err.message.includes("already exists in collection")) {
            return new userError("A member already exists at this email address");
        }
        return new serverError("Could not sign up new member", err);
    })
    if (registrationResult instanceof Error) { return registrationResult }

    const wixUserId = registrationResult.member._id;
    // Generate new member ID
    let rawId = 1 + await wixData.query('member').descending('rawId').find({ suppressAuth: true }).then(result => {
        if (result.totalCount === 0) {
            return 0;
        } else {
            return result.items[0].rawId;
        }
    }).catch((err) => {
        throw new serverError('Could not find ID count using query');
    });
    let publicId = hashids.encode(rawId);
    // Create approval record 
    let approval_record = await wixData.insert('approval', { 'title': publicId }, { suppressAuth: true }).catch(err => {
        return new serverError('Could not create new approval record', err)
    })
    if (approval_record instanceof Error) { return approval_record }

    // Save member record  
    ////Added first and last name here for trainer filter
    let memberRecord = {
        'publicId': publicId,
        'approval': approval_record._id,
        'privateMemberData': wixUserId,
        'rawId': rawId,
        'firstName': userInfo.firstName,
        'lastName': userInfo.lastName,

    }
    const insertResult = await wixData.insert('member', memberRecord, { suppressAuth: true }).catch(err => {
        return new serverError('Failed to insert member record into database', err);
    })
    if (insertResult instanceof Error) { return insertResult }
    if (!registrationResult.sessionToken) { return new serverError("Registration mode failure") }
    return registrationResult.sessionToken;
}

// Add no Payment label to a wix user
export async function markNoPayment(email) {
    const contactQuery = await contacts.queryContacts().eq("primaryInfo.email", email).find({ suppressAuth: true }).catch((err) => {
        return new serverError("Failed to query contacts to update label", err);
    })
    if (contactQuery instanceof Error) return contactQuery;
    if (contactQuery.items != null && contactQuery.items.length > 0) {
        const contactId = contactQuery.items[0]._id;
        const label = await contacts.findOrCreateLabel("No Payments", { suppressAuth: true }).catch(((err) => {
            return new serverError("Failed to get no payment label", err);
        }))
        if (label instanceof Error) { return label }
        const result = await contacts.labelContact(contactId, [label.label.key], { suppressAuth: true }).catch((err) => {
            return new serverError("Failed to add no payment label", err);
        })
        if (result instanceof Error) { return result }
    }
}

// Return useful information regarding member (must be current or admin)
export async function getMember(memberId) {
    let member_query = await wixData.query('member').eq('_id', memberId).limit(1).include('privateMemberData').find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query members');
    })
    if (member_query.totalCount !== 1) {
        throw new serverError('Could not find a member at this ID', memberId);
    }

    let member = member_query.items[0];
    console.log(member.role._id);

    return {
        'memberId': memberId,
        'memberNumber': member.rawId,
        'publicId': member.publicId,
        'wixId': member.privateMemberData._id,
        'firstName': member.privateMemberData.firstName,
        'lastName': member.privateMemberData.lastName,
        'email': member.privateMemberData.loginEmail,
        'address': member.address,
        'pending': member.pending,
        'role': member.role
    }

}

export async function getCurrentMember() {
    // Gets member info for current member
    console.log("getCurrentMember called")
    const currentUser = wixUsers.currentUser;

    if (!currentUser.loggedIn) {
        throw new userError('No member logged in');
    }

    let roles_promise = currentUser.getRoles();

   //let currentUserID = "cada8992-403d-42fc-bb25-3fdb066e9148";

    let member_query = await wixData.query('member').eq('privateMemberData', currentUser.id).limit(1).include('privateMemberData', 'approval', 'documentation').find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query members');
    })

    /*
    // FOR TESTING !!!!
    if (member_query.items && member_query.items.length !== 1) {
        member_query = await wixData.query('member').eq('privateMemberData', "bad20341-e9a1-4bee-960e-7517c045315e").limit(1).include('privateMemberData', 'approval', 'documentation').find({ suppressAuth: true }).catch(err => {
            throw new serverError('Could not query members');
        })
    }
    */

    let member = member_query.items[0];

    console.log("member");
    console.log(member);
    let plan = await roles_promise;

    return {
        'memberId': member._id,
        'memberNumber': member.rawId,
        'publicId': member.publicId,
        'wixId': member.privateMemberData._id,
        'firstName': member.privateMemberData.firstName,
        'lastName': member.privateMemberData.lastName,
        'email': member.privateMemberData.loginEmail,
        'address': member.address,
        'approval': member.approval,
        'pending': member.pending,
        'documentation': member.documentation,
        'roles': plan,
        'plan': plan
    }
}

// Adds an order to a member
export async function addOrder(order) {
    console.log(order)
    order.date = new Date();
    //let member_promise = rawMember();
    let order_record = await wixData.insert('orders', order, { suppressAuth: true }).catch(err => {
        throw new serverError('Could no insert order into database', err);
    });

    //let member = await (member_promise);

    //this is now handled via hook on order table
    /*
    await wixData.insertReference('member', 'orders', member._id, order_record._id, { suppressAuth: true }).catch(err => {
    	throw new serverError('Could not update member with new order', err);
    })
    */
    return 'Order added to member' ///: ' + member._id;
}

// Removes any pending statuses on member info
export async function notPending() {
    let member = await rawMember();
    delete member.pendingStatus;
    delete member.pending;
    await wixData.update('member', member, { suppressAuth: true }).catch(err => {
        throw new serverError('Could not update member as not pending', err)
    })
}

export async function validReferee(trainerID) {
    let count = await wixData.query('member').eq('publicId', trainerID).count({ suppressAuth: true }).catch(err => {
        throw new serverError("Could not count members with this trainer ID", err)
    })
    if (count > 0) {
        return true;
    }
    return false;
}

export async function askReferee(refereeId) {
    const member = await getCurrentMember();
    let referee;
    try {
        referee = await wixData.get("member", refereeId, { suppressAuth: true });
        if (referee.role != "3a46a3c1-0353-432b-bfa4-e9629cc1b311") {
            throw new Error("wrong plan");
        }
    } catch (err) {
        return new userError("No referee at this ID", err);
    }
    if (member.pending === 'volunteer-trainer') {
        member.documentation.vdtReferee = referee._id;
    }
    if (member.pending === 'pro-trainer') {
        member.documentation.pdtReferee = referee._id;
    }
    try {
        await wixData.update("documentation", member.documentation, { suppressAuth: true });
    } catch (err) {
        return new serverError("Could not record referee preference in documentation", err);
    }

    //Generate token
    let secret = await getSecret('jwt');
    let token = jwt.sign({ id: member.memberId, ref: referee._id }, secret);
    let url = websiteLocation + '/referee?token=' + token;
    try {
        await triggeredEmails.emailMember('RuOLnjf', referee.privateMemberData, {
            variables: {
                link: url,
                memberNumber: member.memberNumber,
                memberName: member.firstName + " " + member.lastName,
                refereeName: referee.firstName + " " + referee.lastName
            }
        });
        triggeredEmails.emailMember('RuOLnjf', "4fc336f7-7c07-4ad4-8ab4-6d8f70437895", {
            variables: {
                link: url,
                memberNumber: member.memberNumber,
                memberName: member.firstName + " " + member.lastName,
                refereeName: referee.firstName + " " + referee.lastName
            }
        });
    } catch (err) {
        return new serverError("Could not email referee with request", err);
    }
    return "Done";
}

// Validates a user as referee if current user is set as users referee
export async function refereeValidate(token, answers) {
    //decipher token into id
    let secret = await getSecret('jwt');
    let memberId = null;
   
    try { memberId = jwt.verify(token, secret).id; } catch (err) { throw new serverError("Invalid Token", token) }
    console.log({ memberIdRefereeValidate: memberId })

    //query member table, return member
    let member_query = await wixData.query('member').eq('_id', memberId).include('documentation', 'privateMemberData', 'approval').limit(1).find({ suppressAuth: true }).catch(err => { throw new serverError('Could not query member collection', err); });
    if (member_query.totalCount !== 1) { console.log(member_query); throw new serverError('refereeValidate || Could not isolate member at this ID', memberId); }
    let member = member_query.items[0];

    // Determine membership application type and get public ID of referee 
    let approved = false;
    if (answers.q1 && answers.q2 && answers.q3 && answers.q4 && answers.q5) {
        approved = true;
    }
    const answersString = JSON.stringify(answers);
    const referee = await getCurrentMember();
    let refereePublicId;
    if (member.pending === 'volunteer-trainer' && approved) {
        member.documentation.vdtReferee = referee.memberId;
        member.documentation.vdtApproved = true;
        member.documentation.vdtAnswers = answersString;
    } else if (member.pending === 'volunteer-trainer' && !approved) {
        member.documentation.vdtReferee = referee.memberId;
        member.documentation.vdtApproved = false;
        member.documentation.vdtAnswers = answersString;
    }
    if (member.pending === 'pro-trainer' && approved) {
        member.documentation.pdtReferee = referee.memberId;
        member.documentation.pdtApproved = true;
        member.documentation.pdtAnswers = answersString;
    } else if (member.pending === 'pro-trainer' && !approved) {
        member.documentation.pdtReferee = referee.memberId;
        member.documentation.pdtApproved = false;
        member.documentation.pdtAnswers = answersString;
    }

    //in order, this was after sending rejection notices?
    //Regardless, it is firing twice somehow, failing the second time. 
    /*
    // Check if current user matches public ID of referee 
    let currentMember = await getCurrentMember();
    if (currentMember.publicId !== refereePublicId) {
    	throw new serverError('Current user is not referee elected', currentMember._id);
    }
    */

    // Update documentation record
    await wixData.update('documentation', member.documentation, { suppressAuth: true }).catch(err => { throw new serverError("Could not update documentation", err); })
    await wixData.save('member', member, { suppressAuth: true })
    return "Succesfully Validated Member";
}

//sorts through member table data, including the referenced privateMemberData. Only returns required data.
export async function searchRefs(firstNameIn, lastNameIn, myLimitIn, mySkipIn) {
    console.log({ "search": "setting", "firstNameIn": firstNameIn, "lastNameIn": lastNameIn })
    let refFilter = wixData.query('member').eq("pending", "accredited-pro").eq("pendingStatus", "approved").ge('planExpiredOn', new Date());
    if (firstNameIn && firstNameIn.length > 0) { refFilter = refFilter.contains("firstName", firstNameIn.toLowerCase()); }
    if (lastNameIn && lastNameIn.length > 0) { refFilter = refFilter.contains("lastName", lastNameIn.toLowerCase()); }

    //builds return variables in upper scope in case of failures
    let response = {};
    response.pages = 0;
    response.refs = [];
    console.log({ "refFilter": refFilter })
    //builds filter, returns data
    let dataOut;
    try {
        dataOut = await refFilter.include("privateMemberData").limit(myLimitIn).ascending('firstName').skip(mySkipIn).find({ suppressAuth: true });
        console.log({ "refSearch": dataOut });

        //assign the data allowed to go through.
        if (dataOut && dataOut.items && dataOut.items.length > 0) {
            //get page count
            response.pages = Math.ceil(dataOut.totalCount / myLimitIn)
            response.refs = dataOut.items.map((ref) => {
                let image;
                if (ref && ref.privateMemberData && ref.privateMemberData.picture) {
                    image = ref.privateMemberData.picture
                }
                let name = [];
                if (ref.privateMemberData.firstName) { name.push(ref.privateMemberData.firstName) }
                if (ref.privateMemberData.lastName) { name.push(ref.privateMemberData.lastName) }
                return {
                    "_id": ref.publicId, //ref._id,
                    "refName": name.join(' '),
                    "refImage": image
                    //"all": ref.privateMemberData
                }
            })
        } else {
            dataOut = await wixData.query('member').eq("pending", "accredited-pro").eq("pendingStatus", "approved").ge('planExpiredOn', new Date()).include("privateMemberData").limit(myLimitIn).descending('_updatedDate').find({ suppressAuth: true });
            response.pages = 0;
            response.refs = dataOut.items.map((ref) => {
                let image;
                if (ref && ref.privateMemberData && ref.privateMemberData.picture) {
                    image = ref.privateMemberData.picture
                }
                let name = [];
                if (ref.privateMemberData.firstName) { name.push(ref.privateMemberData.firstName) }
                if (ref.privateMemberData.lastName) { name.push(ref.privateMemberData.lastName) }
                return {
                    "_id": ref.publicId, //ref._id,
                    "refName": name.join(' '),
                    "refImage": image,
                    //"all": ref.privateMemberData
                }
            })
        }
        return response;
    } catch (e) {
        console.log(e)
        return response;
    }
}

export async function getRefs(searchTerm, limit, skip) {
    searchTerm = searchTerm ?? "";
    limit = limit ?? 20;
    skip = skip ?? 0;
    let refFilter = wixData.query('member').eq("role", "3a46a3c1-0353-432b-bfa4-e9629cc1b311").ge('planExpiredOn', new Date());

    // Add Searchterm
    let first = true;
    let searchWords = searchTerm.split(" ");
    let searchFilter = wixData.query('member');

    for (var word of searchWords) {
        if (word.length < 2) {
            continue;
        }
        if (first) {
            searchFilter = searchFilter.contains("firstName", word.toLowerCase());
            first = false;
        } else {
            searchFilter = searchFilter.or(wixData.query("member").contains("firstName", word.toLowerCase()));
        }
        searchFilter = searchFilter.or(wixData.query("member").contains("lastName", word.toLowerCase()));
    }
    if (!first) {
        refFilter = refFilter.and(searchFilter);
    }

    //builds return variables in upper scope in case of failures
    let response = {
        totalPages: 1,
        currentPage: 1,
        skip: skip,
        limit: limit,
        refs: []
    };

    //builds filter, returns data
    let dataOut = await refFilter.include("privateMemberData").limit(limit).ascending('firstName').skip(skip).find({ suppressAuth: true });
    //assign the data allowed to go through.
    if (dataOut && dataOut.items && dataOut.items.length > 0) {
        //get page count
        response.totalPages = Math.ceil(dataOut.totalCount / limit);
        response.currentPage = Math.ceil(skip / limit) + 1;
        response.refs = dataOut.items.map((ref) => {
            let image;
            if (ref && ref.privateMemberData && ref.privateMemberData.picture) {
                image = ref.privateMemberData.picture
            }
            let name = [];
            if (ref.privateMemberData.firstName) { name.push(ref.privateMemberData.firstName) }
            if (ref.privateMemberData.lastName) { name.push(ref.privateMemberData.lastName) }
            let created = new Date(Date.parse(ref._createdDate));
            //let since = `${created.getMonth()} - ${created.getFullYear()}`
            return {
                "_id": ref._id, //ref._id,
                "name": name.join(' '),
                "refImage": image,
                "suburb": ref.address.formatted.split(", ")[1],
                "since": created.toLocaleDateString()
            }
        });
    }
    return response;
}

async function getMemberContactId() {
    if (!wixUsers.currentUser.loggedIn) {
        throw new Error("Must be logged in to view click preferences")
    }
    const email = await wixUsers.currentUser.getEmail().catch((err) => {
        throw new Error("Could not get email for current user")
    });
    const contactInfo = {
        emails: [{
            email: email,
        }]
    }
    const foundContact = await contacts.appendOrCreateContact(contactInfo).catch(() => {
        throw new Error("Could not get contact for user")
    });
    if (foundContact.identityType !== "MEMBER") {
        throw new Error("Ahhhhhhhh");
    }

    return foundContact.contactId;
}

export async function getClickPreference() {
    // Label Keys
    const eCopy = "custom.click-e-copy";
    const hardCopy = "custom.click-hard-copy";
    const contactId = await getMemberContactId();
    const contact = await contacts.getContact(contactId, { suppressAuth: true }).catch(() => {
        throw new Error('Wix gave an invalid contact id')
    });
    //console.log(contact)

    const labels = contact.info.labelKeys;

    if (labels.includes(hardCopy)) {
        return true;
    }
    if (labels.includes(eCopy)) {
        return false;
    }
    return null;
}

export async function setClickPreference(preference) {
    // Label Keys
    const eCopy = "custom.click-e-copy";
    const hardCopy = "custom.click-hard-copy";
    const contactId = await getMemberContactId()

    await contacts.unlabelContact(contactId, [eCopy, hardCopy], { suppressAuth: true }).catch((err) => {
        throw new Error("Could not remove old labels from contact")
    });

    if (preference) {
        await contacts.labelContact(contactId, [hardCopy], { suppressAuth: true }).catch((err) => {
            throw new Error("Could not update contact with new preference")
        })
    } else {
        await contacts.labelContact(contactId, [eCopy], { suppressAuth: true }).catch((err) => {
            throw new Error("Could not update contact with new preference")
        })
    }
    return "Done";
}

export async function getOrders(memberId) {
    /*
    const member = await currentMember.getMember().catch((err) => {
        return new serverError("Could not get current member", err);
    })
    if (member instanceof Error) {return member}
    */
    const ordersQuery = await wixData.query("orders").eq("member", memberId).eq("status", "Successful").descending("_updatedDate").find({ suppressAuth: true }).catch((err) => {
        return new serverError("Could not query orders", err);
    });
    if (ordersQuery instanceof Error) { return ordersQuery }
    if (ordersQuery.items) return ordersQuery.items
    else return []
}
/*
export async function testRef() {
    let member_query = await wixData.query('member').eq('privateMemberData', "e65bd5b0-dd05-440d-8205-4f261ed74346").limit(1).find({ suppressAuth: true }).catch(err => {
        throw new serverError('Could not query members');
    })
    if (member_query.totalCount !== 1) {
        throw new serverError('Could not find a member at this wixId - rawMember');
    }
    let member = member_query.items[0];
    let referee;
    try {
        referee = await wixData.get("member", "60115642-984c-45cd-8f2c-9cb1735ac059", { suppressAuth: true });
        if (referee.role != "3a46a3c1-0353-432b-bfa4-e9629cc1b311") {
            throw new Error("wrong plan");
        }
    } catch (err) {
        return new userError("No referee at this ID", err);
    }

    //Generate token
    let secret = await getSecret('jwt');
    let token = jwt.sign({ id: member._id, ref: referee._id }, secret);
    //this path was changed. tracking down changes
    //let url = websiteLocation + '/referee?token=' + token;
    let url = websiteLocation + '/referee?token=' + token;
    return url;
}
*/

// export async function Test_updateOrder(event) {
//     console.log("member");
//     let order;
//     // await wixData.query('orders').find({ suppressAuth: true });
//     try {
//         //let id = event.payment.id;
//         let id = "d4ea39c2-e4e9-44bb-9bba-6ebb8f4aaf62";
//         let query = await wixData.query("orders").include("role").eq("_id", id).find({ suppressAuth: true });
//         order= query.items[0];
//         console.log(order);
//         //order = await wixData.get("orders", event.payment.id, { suppressAuth: true });
//     } catch (err) {
//         return new serverError("Could not get order in event", err);
//     }
//     // console.log("order" + order);

//     // order.status = event.status;
//     // order.transactionId = event.transactionId;
//     // try {
//     //     await wixData.update("orders", order, { suppressAuth: true });
//     // } catch (err) {
//     //     return new serverError("Could not update order record", err);
//     // }

//     // if (order.status != "Successful" && order.status != "Offline") {
//     //     return;
//     // }

//     // Update member and assign role
//     let member;
//     try {
//         member = await wixData.get("member", order.member, { suppressAuth: true });
//     } catch (err) {
//         return new serverError("Could not get member for order", err);
//     }
//     // logic to figure out new expiration date
//     //let expiryNew = new Date();

//     let expiryNew = member.lastPlanStart;
//     console.log(expiryNew);

//     let expiryOld = member.planExpiredOn;
//     let expiry;
//     if (!expiryOld || expiryOld > expiryNew) {
//         expiry = new Date(expiryOld);
//     } else {
//         expiry = new Date(expiryNew);
//     }
//     // add one year to determined expiration
//     expiry.setFullYear(expiry.getFullYear() + 1);

//     // reset fields for new year
//     member.planExpiredOn = expiry;
//     member.paidStatus = "ACTIVE";
//     member.emailSent7Day = false;
//     member.emailSent30Day = false;
//     member.emailSentStale90day = false;
//     member.emailSentExpired = false;
//     member.lastPlanStart = new Date();
//     member.role = order.role._id;

//     // remove pending if new member
//     if (member.pendingStatus) { delete member.pendingStatus }
//     if (member.pending) { delete member.pending }

//     console.log(member);
//     // Update stuff
//     try {
//         await wixData.update("member", member, { suppressAuth: true });
//     } catch (err) {
//         return new serverError("Could not update member with order status", err);
//     }
//     // try {
//     //     await roles.assignRole(order.role, member.privateMemberData, { suppressAuth: true })
//     //     await addRoleLabel(member);
//     // } catch (err) {
//     //     return new serverError("Could not update member with order status", err);
//     // }
//     // const privateData = await wixData.get("Members/PrivateMembersData", member.privateMemberData, { suppressAuth: true }).catch((err) => {
//     //     return new serverError("Failed to get member private data", err);
//     // })
//     // if (privateData instanceof Error) { return privateData }
//     // const contactQuery = await contacts.queryContacts().eq("primaryInfo.email", privateData.loginEmail).find({ suppressAuth: true }).catch((err) => {
//     //     return new serverError("Failed to query contacts to update label", err);
//     // })
//     // if (contactQuery instanceof Error) return contactQuery;
//     // if (contactQuery.items != null && contactQuery.items.length > 0) {
//     //     const contactId = contactQuery.items[0]._id;
//     //     const label = await contacts.findOrCreateLabel("No Payments", { suppressAuth: true }).catch(((err) => {
//     //         return new serverError("Failed to get label", err);
//     //     }))
//     //     if (label instanceof Error) { return label }
//     //     const result = await contacts.unlabelContact(contactId, [label.label.key], { suppressAuth: true }).catch((err) => {
//     //         return new serverError("Failed to remove label", err);
//     //     })
//     //     if (result instanceof Error) { return result }
//     // }
//      return member;
// }

export async function testpay(orderId) {
    let event = {
        "payment": {
            "id": orderId,
            "amount": 70,
            "currency": "USD",
            "items": [{
                "name": "Baseball Bat",
                "quantity": 1,
                "price": 15.99
            }]
        },
        "userInfo": {
            "firstName": "Mike",
            "lastName": "Trout",
            "countryCode": "USA",
            "phone": null,
            "email": "mike.trout@email.com"
        },
        "status": "Successful",
        "transactionId": "83f1830a-c74e-4abe-894d-3ee388b7e985"
    }
    await updateOrder(event);

}