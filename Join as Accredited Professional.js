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
import wixWindow from 'wix-window';

// Global Variables
let planType = "accredited-pro";
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
        console.log("Join as Accredited Professional 1");
        $w('#submit').enable();
    }
    
}

async function showAddress() {
    let member = await member_promise;
    await site_ready;

    $w("#address").value = member.address;
    console.log("Join as Accredited Professional 2");
}

async function ui_control() {
    await site_ready;
    console.log("Join as Accredited Professional 3");
    $w("#upload").onChange(upload_change);
    $w("#agreement").onCustomValidation(agreementValidation);
    $w("#submit").onClick(submit);
}

async function upload_change() {
    file = null;
    if ($w("#upload").value.length > 0) {
        console.log("Uploading " + $w("#upload").value[0].name);
        $w("#upload")
            .startUpload()
            .then(uploadedFile => {
                file = uploadedFile.url;
                console.log("Join as Accredited Professional 4");
            })
            .catch(uploadError => {
                console.log("File upload error: " + uploadError.errorCode);
                console.log(uploadError.errorDescription);
            });
    }
}

function agreementValidation(value, reject) {
    if (value.length !== 15) {
        reject("All boxes must be checked");
    }
}

function updateValidityDisplay() {
    console.log("Join as Accredited Professional 5");
    $w("#address").updateValidityIndication();
    $w("#agreement").updateValidityIndication();
    $w("#upload").updateValidityIndication();
}

async function valid() {
    await site_ready;
    let outcome = true;
    if (!$w("#address").valid) {
        outcome = false;
        console.log(outcome);
    }
    if (!$w("#agreement").valid) {
        outcome = false;
        console.log(outcome);
    }
    if (!$w("#upload").valid) {
        outcome = false;
        console.log(outcome);
    }
    if (file === null) {
        outcome = false;
        console.log(outcome);
    } else {
        $w('#submit').enable();
    }
    console.log("Join as Accredited Professional 6");

    updateValidityDisplay();
    return outcome;
}

async function submit() {

    $w("#error").hide();
    if (!await valid()) {
        $w("#error").show();
        return;
    }

    const contactPrefs = [];
    for (var opt in $w('#preferences').selectedIndices) {
        contactPrefs.push($w('#preferences').options[opt].label);
    }

    let options = {
        aptCertification: file,
        contactPreferences: contactPrefs
    };

    createApplication(planType, $w("#address").value, options).then(() => {
        wixLocation.to("/success");
    });
}



/**
*	Adds an event handler that runs when the element is clicked.
	[Read more](https://www.wix.com/corvid/reference/$w.ClickableMixin.html#onClick)
*	 @param {$w.MouseEvent} event
*/
