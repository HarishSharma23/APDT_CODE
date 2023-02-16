// For full API documentation, including code examples, visit https://wix.to/94BuAAs

//Import backend module

import wixData from 'wix-data';
import {DirectoryEntryForm} from 'public/directory.js';

$w.onReady(function () {
	initialiseForm();
});

async function initialiseForm() {
	let ui = {
		"name": $w("#name"),
		"email": $w("#email"),
		"phone": $w("#phone"),
		"website": $w("#website"),
		"suburbs": $w("#suburbs"),
		"state": $w("#state"),
		"location": $w("#location"),
		"description": $w("#description"),
		"cover": $w("#cover"),
		"coverImage": $w("#coverupload"),
		"categories": $w("#categories"),
		"submit": $w("#submit")
	}

	let form = new DirectoryEntryForm(ui);
}
