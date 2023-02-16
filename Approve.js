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
import { orderRole, testupdateOrder, testpay } from "backend/member";
import wixPay from 'wix-pay';

// Global Variables
let site_ready = new Promise(resolve => {
    $w.onReady(() => {
        resolve();
    });
});
let plan_slug = wixWindow.lightbox.getContext();
console.log(plan_slug);
//let planId_promise = getPlanID(plan_slug);

// Initiate lightboxs contents
showPlan();
ui_control();

// Lightbox functions
async function showPlan() {
    await site_ready;
    let plan_name = null;
    switch (plan_slug) {
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
    }
    $w("#planName").text = plan_name;
}

async function ui_control() {
    await site_ready;
    //$w("#pay").onClick(purchasePlan);
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
    console.log("start purchase");
    try {
        $w('#pay').disable();
        let order = await orderRole(plan_slug);
        console.log('order info');
        console.log(order);
        if (!order.failed) {
            await wixPay.startPayment(order, { skipUserInfoPage: true });
            wixLocation.to("/new-member");
        }
        $w('#pay').enable();
    } catch (err) {
        console.log(err);
        logError(err.message, err.name, 'backend/getPending/getPending').then(() => {}).catch(() => {});
    }
    console.log("end purchase");
    
}

/**
*	Adds an event handler that runs when the element is clicked.
	[Read more](https://www.wix.com/corvid/reference/$w.ClickableMixin.html#onClick)
*	 @param {$w.MouseEvent} event
*/
export async function pay_click(event) {
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
    //purchasePlan();
}