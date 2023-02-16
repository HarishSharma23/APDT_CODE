import { getClickPreference, setClickPreference } from 'backend/member.jsw';
const preferencePromise = getClickPreference();

$w.onReady(() => {
    loadPreference();
    $w('#save').onClick(save);
})

async function loadPreference() {
    const preference = await preferencePromise;
    if (preference) {
        showHardCopy();
    } else {
        showECopy();
    }
    $w('#deliverMethod').enable();
}

function showHardCopy() {
    $w('#deliverMethod').value = "Hard";
    $w('#hardInfo').show();
}

function showECopy() {
    $w('#deliverMethod').value = "E";
    $w('#hardInfo').hide();
}

async function save() {
    $w('#success').hide();
    $w('#deliverMethod').disable();
    const value = $w('#deliverMethod').value;
    if (value === "Hard") { 
        await setClickPreference(true);
        showHardCopy();
    }
    else { 
        await setClickPreference(false)
        showECopy();
    }
    $w('#success').show();
    $w('#deliverMethod').enable();
}