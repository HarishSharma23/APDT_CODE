// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixUsers from 'wix-users'
import wixData from 'wix-data'
import { currentMember } from 'wix-members';

$w.onReady(async function () {
    	console.log(wixUsers.currentUser.id);
    let entryQuery = await wixData.query("directory").eq("_owner", wixUsers.currentUser.id).count();
    let roles = await wixUsers.currentUser.getRoles();
    console.log('roles');

    console.log('roles2');
    //let proRole = roles.find(element => element.name === "Accredited Professional" || "Professional");
    let proRole = roles.find(element => console.log('the' + element.name));
    console.log(proRole);
    if (proRole !== undefined) {
        $w('#submit').enable();
        $w('#submitNew').enable();
        $w('#directory').hide();
    }
    if ((await entryQuery) === 0) {
        $w('#edit').hide();
        $w('#add').show();
    }
    // currentMember.getRoles()
    //     .then((roles) => {
    //         console.log(roles);
    //     })
    //     .catch((error) => {
    //         console.error(error);
    //     });

});