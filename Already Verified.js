/*

Overview

    - Get plan type from query term

    - Display plan info
    
    - On pay now click
        - Get plan info from backend
        - Create plan order
        - Initiate wix pay for order
*/

//Imports
import { orderRole } from "backend/member";
import wixPay from 'wix-pay';
import wixLocation from "wix-location";

// Global Variables
let site_ready = new Promise((resolve) => { resolve() })
if (wixLocation.query.plan === undefined) {
    throw new Error("Page requires plan slug");
}
let plan_slug = wixLocation.query.plan;

// Initialise page
showPlan();
ui_control();

// Page functions

async function showPlan() {
    await site_ready;
    let plan_name = null;
    console.log(plan_slug);
    switch (plan_slug) {
    case "accredited-pro":
        plan_name = "Accredited Professional Trainer";
        break;
    case "pro-trainer":
        plan_name = "Professional Trainer";
        break;
    case "volunteer-trainer":
        plan_name = "Volunteer Trainer";
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
    $w("#payNow").onClick(purchasePlan);
}

async function purchasePlan() {
    let order = await orderRole(plan_slug);
    if (!order.failed) {
        const result = await wixPay.startPayment(order);
        if (result.status == "Successful" || result.status == "Pending") {
            wixLocation.to("/new-member");
        }
    }
}