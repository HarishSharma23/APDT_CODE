import { getRefs, askReferee, getCurrentMember } from "backend/member.jsw";
import { session } from 'wix-storage';
import wixLocation from 'wix-location';

import wixWindow from 'wix-window';

const pageSize = 20;

$w.onReady(async () => {
    $w('#refRepeater').onItemReady(onItemReady);
    const member_promise = currentMember();
    let data = await load();
    $w("#refRepeater").data = data.refs;
    $w('#pagination').totalPages = data.totalPages;
    $w('#pagination').currentPage = data.currentPage;
    $w('#pagination').onChange(updatePage);
    $w('#submit').onClick(updatePage);

    const member = await member_promise;
    if (member.pending && member.pending == "pro-trainer") {
        $w('#explain').text = "All of the members listed are Accredited Professional Dog Trainers. Please select a Trainer who knows you and your training methods. We ask the trainer to complete a questionnaire about you and once we receive their reply, we will let you know. If you cannot locate anyone who can support your application, please email membership@apdt.com.au and let them know.";
    } else if (member.pending && member.pending == "volunteer-trainer") {
        $w('#explain').text = "To become a Volunteer Trainer you must seek approval from an APDT Accredited Professional";
    } else {
        $w('#explain').text = "This page isn't for you. Your membership has already been approved or does require nominating a referee";
        //$w("#refRepeater").collapse();
        /*
        setTimeout(() => {
            wixLocation.to(wixLocation.baseUrl);
        }, 8000);
        return;
        */
    }
    $w('#submit').enable();
    $w('#pagination').enable();
})

function onItemReady($item, itemdata, index) {
    $item('#trainerName').text = itemdata.name;
    $item('#suburb').text = itemdata.suburb;
    $item('#state').text = itemdata.state;
    $item('#date').text = itemdata.since;
    $item("#request").onClick(async () => {
        $item('#request').disable();
        let result = await askReferee(itemdata._id).catch((err) => {
            console.log(err);
        })
        if (!result.error) {
            $item("#sent").show();
            setTimeout(() => {
                wixLocation.to("/success");
            }, 2000);
        }
    })
    $item('#request').enable();
}

async function updatePage() {
    $w('#pagination').disable();
    $w('#submit').disable();
    let currentPage = $w('#pagination').currentPage;
    let skip = (currentPage - 1) * pageSize;
    let searchTerm = $w('#search').value;
    let data = await load(searchTerm, pageSize, skip);
    console.log(`updated data`)
    console.log(data)
    if (data.totalPages == 1 && data.refs.length == 0) {
        $w('#refRepeater').hide();
        $w('#pagination').hide();
        $w('#none').show();
    } else {
        $w('#none').hide();
        $w('#pagination').show();
        $w('#refRepeater').show();
    }
    $w("#refRepeater").data = data.refs;
    $w('#pagination').totalPages = data.totalPages;
    $w('#pagination').currentPage = data.currentPage;
    $w('#pagination').enable();
    $w('#submit').enable();
}

async function load(searchTerm, limit, skip) {
    let refs;
    if (wixWindow.rendering.env == "backend") {
        refs = await getRefs(searchTerm);
        wixWindow.warmupData.set(`refdata+${searchTerm}-${limit}-${skip}`, refs);
    } else {
        refs = wixWindow.warmupData.get(`refdata+${searchTerm}-${limit}-${skip}`) || await getRefs(searchTerm, limit, skip);
    }
    return refs;
}

async function currentMember() {
    let member;
    if (wixWindow.rendering.env == "backend") {
        member = await getCurrentMember();
        wixWindow.warmupData.set('member', member);
    } else {
        member = wixWindow.warmupData.get('member') || await getCurrentMember();
    }
    return member;
}