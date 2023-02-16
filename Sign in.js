// Imports
import wixUsers from 'wix-users';
import wixWindow from 'wix-window';

$w.onReady(() => {
	signInForm_control($w);
	$w('#text11').onClick(() => {
		wixUsers.promptForgotPassword();
	})
});

// Sign in form \\
function signInForm_control(env) {
	const email_input = env("#email");
	const password_input = env("#password");
	const login_button = env("#login");
	const error_text = env("#text10");

	email_input.onKeyPress(attempt);
	password_input.onKeyPress(attempt);
	login_button.onClick(login_click);

	async function login_click() {
		let email = email_input.value;
		let password = password_input.value;
		// Log in using backend
		wixUsers.login(email, password).then(() => {
			wixWindow.lightbox.close();
		}).catch(() => {
			fail();
		})
	}

	function fail() {
		login_button.disable();
		error_text.show();
	}

	function attempt() {
		login_button.enable();
		error_text.hide();
	}
}