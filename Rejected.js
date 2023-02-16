/*

Overview

    - Get plan type from context
    - Display plan Name
    
    - On pay now click
        - Get plan info from backend
        - Create plan order
        - Initiate wix pay for order
*/

// Imports
import { notPending } from "backend/member";

// Global Variables
let site_ready = new Promise(resolve => {
	$w.onReady((resolve) => {
        
    });
});

// Initiate lightboxs contents
seen();

// Lightbox functions
function seen() {
	return notPending();
}