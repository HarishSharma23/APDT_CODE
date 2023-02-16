import wixWindow from 'wix-window';
import { getCurrentMember, cancel } from "backend/member";

const member_promise = getMember();

$w.onReady(function () {
    $w('#cancel').onClick(showSure);
    $w('#yes').onClick(yes);
    $w('#no').onClick(no);
    member_promise.then((member) => {
        $w('#loading').hide();
        if (member.roles && member.roles.length > 0) {
            const level = member.roles[0].name;
            if (level === "Associate") {
                
            }
            $w('#level').text = level;
            $w('#hasPlan').show();
            $w('#associateWarn').show();
            $w('#warnText').hide();
        } else {
            $w('#noPlans').show();
        }
    })
});

async function showSure() {
    $w('#cancel').disable();
    $w("#error").hide();
    $w('#confirm').show("fade");
    $w('#no').enable();
    $w('#yes').enable();
}

async function no() {
    $w('#cancel').enable();
    $w('#confirm').hide("fade");
}

async function yes() {
    $w('#cancel').disable();
    $w('#no').disable();
    $w('#yes').disable();
    const result = await cancel();
    console.log(result);
    $w('#confirm').hide();
    if (result.error) {
        $w('#error').show();
        $w('#confirm').hide();
        $w('#cancel').enable();
        return;
    }
    $w('#hasPlan').hide();
    $w('#noPlans').show();
}

async function getMember() {
    let member;
    if (wixWindow.rendering.env == "backend") {
        member = await getCurrentMember();
        wixWindow.warmupData.set(`member`, member);
    } else {
        member = wixWindow.warmupData.get(`member`) || await getCurrentMember();
    }
    return member;
}