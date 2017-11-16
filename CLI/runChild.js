const childModule = require('../main.js');
const preImportEnv = require('child-development-kit').preImportEnv;
const updateD2L = require('child-development-kit').updateD2L;
// const updateCanvas = require('child-development-kit').updateCanvas;
var gauntletNum = 0;

if (process.argv.includes('update')) {
    if (process.argv.includes('d2l')) {
        updateD2L();
    } else if (process.argv.includes('canvas')) {
        console.log('Canvas updating not implemented yet');
        // updateCanvas();
    } else {
        console.log('Please specify "d2l" or "canvas" when updating.');
    }

    /* Launch the module */
} else {
    if (process.argv.includes('gauntlet')) {
        gauntletNum = process.argv[process.argv.indexOf('gauntlet') + 1];
        if (gauntletNum > 4 || gauntletNum < 1) {
            console.log('Invalid gauntlet number.');
        }
    }
    console.log('Running your child module on Gauntlet ' + gauntletNum)
    preImportEnv(childModule, gauntletNum, (error, allCourses) => {
        if (error) console.error(error);
        else {
            console.log('\nTrial run complete\n');
        }
    });
}
