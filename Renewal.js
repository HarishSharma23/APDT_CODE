/*

Overview

    - Get plan type from context
    - Display plan Name
    
    - On pay now click
        - Get plan info from backend
        - Create plan order
        - Initiate wix pay for order
*/

// Imports
import wixWindow from "wix-window";
import wixLocation from "wix-location";
import { logError } from 'backend/weFixWix/util/errors';
import { orderRole } from "backend/member";
import { isPending, currentStatus, testpay } from "backend/member";
import wixPay from 'wix-pay';

let dataIn;
let plan_slug;

$w.onReady(() => {
    dataIn = wixWindow.lightbox.getContext();
    console.log("order.items");
    showPlan();
    //$w("#pay").onClick(purchasePlan);

});

async function showPlan() {

    console.log('dataIn', dataIn);
    console.log('dataInroleslug', dataIn.roleSlug);
    if (!dataIn?.roleSlug) {
        console.log('No Slug Provided');
        let res = await currentStatus().catch(e => console.log(e));
        console.log('res check', res);
        if (res?.roleSlug) {
            dataIn = res;
        } else {
            wixWindow.lightbox.close();
            return;
        }

    }
    console.log("order.items2");
    plan_slug = dataIn.roleSlug;
    let plan_name;
    switch (dataIn.roleSlug) {
    case "accredited-pro":
        plan_name = "Accredited Professional Dog Trainer";
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
    default:
        console.log('Invalid Slug Provided');
        wixWindow.lightbox.close();
        return;
    }
    $w("#planName").text = plan_name;
}

/*
async function purchasePlan() {
	wixPaidPlans.purchasePlan((await planId_promise)).then(async (purchase) => {
		addOrder(purchase);
		await notPending();
		wixLocation.to("/new-member");
	});
}
*/

async function purchasePlan() {

    $w('#pay').disable();
    let l = $w('#pay').label;
    $w('#pay').label = 'Loading...';
    try {
        let order = await orderRole(plan_slug);
        console.log("order.items");
        console.log(order.items);
        if (!order.failed) {
            let res = await wixPay.startPayment(order, { skipUserInfoPage: true });
            if (res?.status === 'Successful') {
                wixLocation.to("/new-member");
            } else {
                throw 'Error - status not allowed';
            }
        } else {
            $w('#pay').label = 'Error - try again';
            setTimeout(() => {
                $w('#pay').label = l;
                $w('#pay').enable();
            }, 2500);
        }
    } catch (err) {
        console.log(err);
        logError(err.message, err.name, 'backend/getPending/getPending').then(() => {}).catch(() => {});
        $w('#pay').label = 'Error - try again';
        setTimeout(() => {
            $w('#pay').label = l;
            $w('#pay').enable();
        }, 2500);
    }
}






export async function pay_click_1() {
console.log("Now click working");
    
    $w('#pay').disable();
    let order = await orderRole(plan_slug);
        console.log('order info');
        console.log(order);
        if (!order.failed) {
            await wixPay.startPayment(order, { skipUserInfoPage: true });
            wixLocation.to("/new-member");
        }

    $w('#pay').enable();
    testpay(order);
  
    //purchasePlan();: 
}