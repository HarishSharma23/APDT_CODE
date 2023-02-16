import wixMembers from 'wix-members';
import wixWindow from "wix-window";
import wixSite from 'wix-site';
import wixLocation from 'wix-location';
import { isPending, currentStatus } from "backend/member";
import { logError } from 'backend/weFixWix/util/errors';
import wixData from 'wix-data';

// Show site build in info
console.log({ "rev": wixSite.revision });
let running = false;

$w.onReady(() => {
    memberUI_control();
    wixMembers.authentication.onLogin(() => { memberUI_control(true) });
    $w("#logout").onClick(() => {
        wixMembers.authentication.logout();
    });
    $w("#signIn").onClick(signIn_onClick);
});

// If logged in check still approved for current membership type
async function memberUI_control(login) {
    if (running) { return }
    running = true;
    let pending_promise = isPending();
    let mem = await wixMembers.currentMember.getMember().catch(e => console.log(e));
    let q = wixLocation.query;
    let runStatusCheck = q.renew || login || !wixLocation.path[0] || wixLocation.path[0] === '';

    console.log(wixLocation.path, runStatusCheck, mem);
    if (mem?._id && runStatusCheck) {
        console.log('running status check');
        // check for expired or stale
        var res = await currentStatus().catch(e => console.log(e));
        console.log('currentStatus', res);
        if (res?.paidStatus === 'EXPIRED') {
            await wixWindow.openLightbox('Renewal', res);
        } else {
            console.log('no status returned');

        }
    } else {
        console.log('no status check');
    }
    //console.log({ q: q })
    if (q?.next) {
        wixLocation.to(q.next);
        running = false;
        return;
    } else if (q.renew) {
        // wixWindow.openLightbox('Renewal');
    }

    // let user = wixUsers.currentUser;
    if (mem?._id) {
        $w("#join").hide();
        $w("#signIn").hide();
        $w("#signIn2").hide();
        $w('#logout').show();
        // $w('#myAccount').show();
        // let adminRole;
        // try {
        //     adminRole = (await wixMembers.currentMember.getRoles()).find(element => element.title.toLowerCase() === "admin");
        // } catch (err) {
        //     console.log(err);
        //     logError(err.message, err.name, 'masterPage/memberUI_control - admin role').then(() => {}).catch(() => {});
        // }
        console.log("mem?._id");
        console.log(mem?._id);

        let pending;
        let status = null
        let paymentstatus = null;
        try {
            pending = await pending_promise;
            let query = await wixData.query('member').eq("privateMemberData", mem._id).find();
            if (query.length > 0) {
                console.log(query.items[0].paidStatus);
                paymentstatus = query.items[0].paidStatus;
                //status =query.items[0].status;
            }
            // let query2 = await wixData.query('planPurchaseRecord').eq("_id", "56c885f3-85d9-4931-8044-255d9df55871").find({ suppressAuth: true });
            // console.log('query2');
            // console.log(query2);
        } catch (err) {
            console.log(err);
            logError(err.message, err.name, 'masterPage/memberUI_control - pending promise').then(() => {}).catch(() => {});
        }
        //console.log({ adminRole: adminRole, pending: pending })
        if (pending && pending.status === 'approved' && pending.slug) {
            wixWindow.openLightbox("Approved", pending.slug);
            // // if (paymentstatus === 'EXPIRED' || paymentstatus === 'expired') {
            // //     await wixWindow.openLightbox('Renewal', res);
            // // } else if (paymentstatus === 'ACTIVE' || paymentstatus === 'active' && pending.status === 'approved') {
            // //     console.log("no pop up showed");
            //  //}
            //   else {
            //     
            // }
            
        } else if (pending && pending.status === 'rejected' && pending.slug) {
            wixWindow.openLightbox("Rejected", pending.slug);
        }

    } else {
        $w("#join").show();
        $w("#signIn").show();
        $w("#signIn2").show();
        $w('#logout').hide();
        // $w('#myAccount').hide();
    }
    running = false;
}

function signIn_onClick() {
    wixWindow.openLightbox("Sign In");
}