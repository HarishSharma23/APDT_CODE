/*

Overview

    - Get plan type from approval (pending)
    - Display plan info
    
    - On cancel click
		:- cancel existing membership 
		:- Go to join APDT page
*/

// Imports
import { getCurrentMember, notPending } from "backend/member";
import wixLocation from "wix-location";

// Global Variables
let site_ready = new Promise(resolve => {
  $w.onReady(resolve);
});
let member_promise = getCurrentMember();

// Initialise Page functions
showPlan();
ui_control();

// Page functions
async function showPlan() {
  await site_ready;
  let plan_slug = (await member_promise).pending;
  let plan_name = null;
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
  $w("#cancel").onClick(cancel_click);
  $w("#confirm").onClick(confirm_click);
}

function cancel_click() {
  $w("#confirm").show();
  setTimeout(function() {
    $w("#confirm").hide("fade");
  }, 10000);
}

async function confirm_click() {
  $w("#confirm").disable();
  $w("#confirm").label = "Please Wait";
  await notPending();
  wixLocation.to("/choose-plan");
}
