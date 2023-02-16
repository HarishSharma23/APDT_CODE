// For full API documentation, including code examples, visit http://wix.to/94BuAAs
import wixUsers from 'wix-users';

/*

Overview

    - Get plan from member
    - Show plan name

*/

let site_ready = new Promise(resolve => {
    $w.onReady(()=> {
        resolve();
    });
});

// Initiate page functions
showPlan();

// Page functions
async function showPlan() {
    await site_ready;
    $w('#planName').text = (await wixUsers.currentUser.getRoles())[0].name
}