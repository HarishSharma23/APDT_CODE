// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixWindow from "wix-window";
import { contacts } from 'wix-crm';
import wixCrm from 'wix-crm';

$w.onReady(function () {
    //TODO: write your page related code here...
    populateUI();
    $w('#submit').onClick(submitForm)
});

function populateUI() {
    let receivedData = wixWindow.lightbox.getContext();
    $w('#book').text = receivedData.book;
    $w('#format').text = receivedData.format;
}

async function submitForm() {
    $w('#error').hide();
    if (!validForm()) {
        $w('#error').show();
        return;
    }
    let options = {
        "variables": {
            "book": $w('#book').text,
            "format": $w('#format').text,
            "name": $w('#name').value,
            "phone": $w('#phone').value,
            "email": $w('#email').value,
            "address": $w('#address').value.formatted
        }
    }

    const contactInfo = {
        name: {
            first: "Librarian",
            last: ""
        },
        emails: [{
            email: "library@apdt.com.au",
        }]
    };

    const contact = await contacts.appendOrCreateContact(contactInfo);
    wixCrm.emailContact('SUi2o7W', contact.contactId, options)
    wixWindow.lightbox.close();
}

function validForm() {
    let valid = true;
    if (!$w('#name').valid) {
        valid = false;
    }
    if (!$w('#phone').valid) {
        valid = false;
    }
    if (!$w('#email').valid) {
        valid = false;
    }
    if (!$w('#address').valid) {
        valid = false;
    }
    updateFormValidityIndications();
    return valid;
}

function updateFormValidityIndications() {
    $w('#name').updateValidityIndication();
    $w('#phone').updateValidityIndication();
    $w('#email').updateValidityIndication();
    $w('#address').updateValidityIndication();
}