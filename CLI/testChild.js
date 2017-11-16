const childModule = require('../main.js');
const preImportEnv = require('child-development-kit').preImportEnv;
const updateD2L = require('child-development-kit').updateD2L;
const runTest = require('../Tests/childTests.js');
const asyncLib = require('async');
// const updateCanvas = require('child-development-kit').updateCanvas;

/* Run Tests on Gauntlet Courses */
preImportEnv(childModule, -1, (error, allCourses) => {
    if (error) console.error(error);
    else {
        asyncLib.eachOf(allCourses, (gauntlet, i, callback) => {
            runTest[`gauntlet${i + 1}`](gauntlet,
                (err, course) => {
                    if (err) callback(err);
                    else {
                        console.log(`Gauntlet ${i + 1} Tests Complete`);
                        callback(null);
                    }
                });
        }, eachErr => {
            if (eachErr) console.error(eachErr);
            else {
                console.log('All gauntlet tests are complete.');
            }
        });
    }
});
