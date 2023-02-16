import wixData from 'wix-data';

const site_ready = new Promise(resolve => { $w.onReady(() => { resolve() }) });
handlers();

async function handlers() {
    await site_ready;
    $w('#debug').onClick(async () => {
        console.log(await addRoles())
    })
}

async function addRoles() {
    const ap = {
        "_id": "3a46a3c1-0353-432b-bfa4-e9629cc1b311",
        "title": "Accredited Professional",
        "price": 70,
        "slug": "accredited-pro"
    }
    const pt = {
        "_id": "badeed59-bc6c-497b-aa40-55b0eb923cda",
        "title": "Professional Trainer",
        "price": 65,
        "slug": "accredited-pro"
    }
    const vt = {
        "_id": "6b4e9ccd-5975-49e7-a728-0ed208d164dd",
        "title": "Volunteer Trainer",
        "price": 60,
        "slug": "volunteer-trainer"
    }
    const pcp = {
        "_id": "2e516e04-d01f-4ac9-b319-0181f0644a8e",
        "title": "Pet Care Professional",
        "price": 60,
        "slug": "pet-care-pro"
    }
    const st = {
        "_id": "ef2c675d-082e-4d24-a2d9-9b70cd2e2f2c",
        "title": "Student",
        "price": 35,
        "slug": "student"
    }
    const as = {
        "_id": "f296604c-e0f8-4ee1-9581-fa8747bf8bd6",
        "title": "Associate",
        "price": 55,
        "slug": "associate"
    }

    const roles = [ap, pt, vt, pcp, st, as];
    return wixData.bulkInsert("MemberRoles", roles);
}