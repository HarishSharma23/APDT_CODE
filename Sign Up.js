// For full API documentation, including code examples, visit http://wix.to/94BuAAs
import wixWindow from 'wix-window';
import { register } from 'backend/member';
import { authentication } from 'wix-members';

$w.onReady(function () {
    $w("#signup").onClick((event) => {
        signup();
    })
    $w("#cancel").onClick((event) => {
        close();
    })
    $w('#password').onChange(() => {
        $w('#confirmpass').value = $w('#confirmpass').value;
        $w('#confirmpass').updateValidityIndication();
    })
    $w('#confirmpass').onChange(() => {
        $w('#password').value = $w('#password').value;
        $w('#password').updateValidityIndication();
    })

    $w('#password').onCustomValidation(passwordValidation);
    $w('#confirmpass').onCustomValidation(passwordValidation);
});

async function signup() {
    $w('#error').hide();
    $w('#emailError').hide();
    if (valid()) {
        let userInfo = {
            "firstName": $w("#fName").value,
            "lastName": $w("#lName").value,
            "email": $w('#email').value,
            "password": $w('#password').value,
            "phone": $w('#phone').value,
        }
        // Register with backend
        let token
        try {
            token = await register(userInfo);
        } catch (err) {
            $w('#emailError').show();
            return;
        }
        if (token === undefined) {
            throw Error('Need session token to log user in');
        }
        await authentication.applySessionToken(token).catch((err) => {
            console.log(err);
            $w('#error').show();
        })
        wixWindow.lightbox.close("Success");
    } else {
        $w('#error').show();
    }
}

function close() {
    wixWindow.lightbox.close("Fail");
}

function passwordValidation(value, reject) {
    if ($w('#password').value !== $w('#confirmpass').value) {
        reject('passwords must be the same')
    }
}

function valid() {
    let outcome = true;
    if (!$w('#fName').valid) {
        outcome = false;
    }
    if (!$w('#lName').valid) {
        outcome = false;
    }
    if (!$w('#email').valid) {
        outcome = false;
    }
    if (!$w('#phone').valid) {
        outcome = false;
    }
    if (!$w('#password').valid) {
        outcome = false;
    }
    if (!$w('#confirmpass').valid) {
        outcome = false;
    }
    return outcome;
}