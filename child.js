const childModule = require('./main.js');
const testEnv = require('child-development-kit').preImportEnv;
const updateD2L = require('child-development-kit').updateD2L;
// const updateCanvas = require('child-development-kit').updateCanvas;
// const argv = require('yargs').argv;

const argv = require('yargs').option('update', {
    alias: 'u',
    describe: 'Select which gauntlet suite to update. ',
    choices: ['d2l', 'canvas']
}).argv;

if (argv.update) {
    if (argv.update.toLowerCase() === 'd2l') {
        updateD2L();
    } else if (argv.update.toLowerCase() === 'canvas') {
        // updateCanvas();
    }

    /* Run Tests on Gauntlet Courses */
} else {
    testEnv(childModule, 0, (error, course) => {
        if (error) console.error(error);
        else {



        }
    });
}
