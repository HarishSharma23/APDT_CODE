import wixWindow from 'wix-window';

const documentation = wixWindow.lightbox.getContext();

$w.onReady(function () {
    if (!documentation) {
        return
    }
    let answers;
    if (documentation.vdtAnswers) {
        answers = JSON.parse(documentation.vdtAnswers);
    }
    if (documentation.pdtAnswers) {
        answers = JSON.parse(documentation.pdtAnswers);
    }
    const questions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    try {
        for (var element of questions) {
            if (answers[element]) {
                $w(`#${element}yes`).show();
            } else {
                $w(`#${element}No`).show();
            }
        }
    } catch {
        throw new Error(`Could not show answer element ${element}`);
    }
    if (answers.q6) {
        $w('#additional').value = answers.q6;
        $w('#additional').show();
    }
});