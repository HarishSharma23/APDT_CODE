/*

Overview:

- Display properties of applicant
    - Get token from query term
    - Get user info via token from backend
- Enable verify button if valid

- Verify Application on backend

*/

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { showMember, refereeValidate } from "backend/member";

let site_ready = new Promise(resolve => { $w.onReady(() => { resolve(); }); });
const booleans = ["q1", "q2", "q3", "q4", "q5"];

showDetails();
uiControl();

// UI Functions
async function showDetails() {

    let query = wixLocation.query;
    console.log("query");
    console.log(wixLocation.query.token);

    if (query.token === undefined) {
        console.log("nothidng return");
    }

    console.log("memberInfo");
    let memberInfo = await load(query.token);

    console.log(memberInfo);
    await site_ready;

    if (memberInfo.error) {
        $w('#expired').show();
        $w('#box1').hide();
        $w('#loading').hide();

        //return;
    }

    $w('#text62').text = memberInfo.firstName + ' ' + memberInfo.lastName;
    $w('#text64').text = memberInfo.email;
    if (memberInfo.address) {
        $w('#text66').text = memberInfo.address.formatted;
    }
    $w('#loading').hide("fade");

    let plan_slug = memberInfo.type;
    let plan_name = null;
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

    $w("#text69").text = plan_name;
    $w('#q1').text = `Do you know this person as a ${plan_name}?`;
    $w('#q4').text = `Can you confidently recommend this person to a client looking for
a force free ${plan_name}`;
    $w('#q5').text = `Do you support this person’s claim of being a force-free ${plan_name}?`;

    $w('#verify').enable();

}

async function uiControl() {
    await site_ready;
    $w('#verify').onClick(() => {
        //$w('#verify').disable();
        let answers = {
            q1: $w("#q1yes").checked,
            q2: $w("#q2yes").checked,
            q3: $w("#q3yes").checked,
            q4: $w("#q4yes").checked,
            q5: $w("#q5yes").checked,
        }
        if ($w('#q6yes').checked) {
            answers.q6 = $w('#additional').value;
        }
        refereeValidate(wixLocation.query.token, answers)
            .then(() => {
                $w('#stuff').hide();
                $w('#done').show();
            })
            .catch((e) => {
                console.log(e);
                $w('#verify').enable();

            });

    });
    syncBooleans();
    $w('#q6yes').onClick(async () => {
        $w('#q6no').disable();
        $w('#q6yes').disable();
        if ($w("#q6yes").checked) {
            await $w('#additional').expand();
        }
        $w('#q6no').checked = !$w('#q6yes').checked
        $w('#q6no').enable();
        $w('#q6yes').enable();
    })
    $w('#q6no').onClick(async () => {
        $w('#q6no').disable();
        $w('#q6yes').disable();
        $w('#q6yes').checked = !$w('#q6no').checked
        if ($w("#q6yes").checked) {
            await $w('#additional').collapse();
        }
        $w('#q6no').enable();
        $w('#q6yes').enable();
    })
    $w('#q6yes').enable();
    $w('#q6no').enable();
}

function syncBooleans() {
    try {
        for (let element of booleans) {
            $w(`#${element}yes`).onClick(async () => {
                $w(`#${element}no`).checked = !$w(`#${element}yes`).checked;
            })
            $w(`#${element}no`).onClick(async () => {
                $w(`#${element}yes`).checked = !$w(`#${element}no`).checked;
            })
        }
        enableBooleans();
    } catch {
        throw new Error(`Failed to set sync for form elements`);
    }
}

function disableBooleans() {
    try {
        for (var element of booleans) {
            $w(`#${element}yes`).disable();
            $w(`#${element}no`).disable();
        }
    } catch {
        throw new Error(`Could not enable form element ${element}`);
    }
}

function enableBooleans() {
    try {
        for (var element of booleans) {
            $w(`#${element}yes`).enable();
            $w(`#${element}no`).enable();
        }
    } catch {
        throw new Error(`Could not enable form element ${element}`);
    }
}

async function load(token) {
    let memberInfo;
    if (wixWindow.rendering.env == "backend") {
        memberInfo = await showMember(token);
        wixWindow.warmupData.set(`memberData+${token}`, memberInfo);
    } else {
        console.log(wixWindow.warmupData.get(`memberData+${token}`));
        memberInfo = wixWindow.warmupData.get(`memberData+${token}`) || await showMember(token);
    }
    return memberInfo;
}