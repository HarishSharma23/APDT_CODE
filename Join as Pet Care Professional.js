/*

Overview:

- Send existing members to already member page
- Send already approved members to already approved page
- Send active members to already member page

- Populate address with existing

- Parse form contents

    Check for valid input

    - Address Valid
    - Agreements checked
    - Documentation uploaded

    :- create member via backend -> to success page
    :- highlight bad inputs

*/

import { getCurrentMember, createApplication } from "backend/member";
import wixLocation from "wix-location";

// Global Variables
let planType = "pet-care-pro";
let file = null;

let site_ready = new Promise(resolve => {
    $w.onReady(() => {
        resolve();
    });
});
let member_promise = getCurrentMember();

// Initialise page functions
redirectBad();
showAddress();
ui_control();

// Function definitions

async function redirectBad() {
    let member = await member_promise;
    console.log(member)
    if (member.pending) {
        wixLocation.to("/pending");
    } else if (member.roles.length > 0) {
        wixLocation.to("/already-member");
    } else if (member.approval[planType] === true) {
        let url = "/already-verified?plan=" + planType;
        wixLocation.to(url);
    } else {
        $w('#submit').enable();
    }
}

async function showAddress() {
    let member = await member_promise;
    await site_ready;
    $w("#address").value = member.address;
}

async function ui_control() {
    await site_ready;
    $w("#agreement").onCustomValidation(agreementValidation);
    $w("#submit").onClick(submit);
}

function agreementValidation(value, reject) {
    if (value.length !== 15) {
        reject("All boxes must be checked");
    }
}

function updateValidityDisplay() {
    $w("#address").updateValidityIndication();
    $w("#agreement").updateValidityIndication();
}

async function valid() {
    await site_ready;
    let outcome = true;
    if (!$w("#address").valid) {
        outcome = false;
    }
    if (!$w('#profType').valid) {
        outcome = false
    }
    if (!$w("#agreement").valid) {
        outcome = false;
    }
    updateValidityDisplay();
    return outcome;
}

async function submit() {
    $w('#submit').disable();
    $w('#submit').label = 'Submitting...'
    $w("#error").hide();

    let checkValid = await valid();
    if (!checkValid) {
        $w("#error").show();
        $w('#submit').label = 'Agree and Submit Application';
        $w('#submit').enable();
        $w("#error").text = 'Please ensure you have agreed to each condition.'
        return;
    }

    const contactPrefs = [];
    for (var opt in $w('#preferences').selectedIndices) {
        contactPrefs.push($w('#preferences').options[opt].label);
    }
    let options = {
        contactPreferences: contactPrefs,
		profType: $w('#profType').value
    }

    createApplication(planType, $w("#address").value, options).then(() => {
            wixLocation.to("/success");
        })
        .catch(() => {
            $w('#submit').label = 'Agree and Submit Application';
            $w('#submit').enable();
        });
}