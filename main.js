/*eslint-env node, es6*/
/*eslint no-unused-vars:0*/
/*eslint no-console:0*/
/*eslint no-undef:0*/
const async = require('async'),
    cheerio = require('cheerio'),
    pathLib = require('path'),
    URL = require('url');

/*Take a course object and return a list (array) of content pages that are used in the course. */
module.exports = (course, stepCallback) => {
    var $;
    /*convert to paths*/
    function htmlFileObjToPath(htmlFileObj) {
        return htmlFileObj.path;
    }
    /*filter to html*/
    function toHtml(path) {
        return pathLib.extname(path) === '.html';
    }
    /*filter to unique*/
    function toUnique(path, i, filteredArray) {
        return filteredArray.indexOf(path) === i;
    }
    /*filter to hrefs from an obj*/
    function toHrefCheerio(i, resource) {
        return $(resource).attr('href')
    }
    var start = 1;

    function printRound(n) {
        start = start + n;
        //console.log(start);
    }

    //helper function for getManifestHtmlFilepaths
    function getManifest() {
        var manifest = course.content.find(function (file) {
            return file.name === 'imsmanifest.xml';
        });
        return manifest;
    }

    //1. Get List of absolute filepaths in the manifest
    function getManifestHtmlFilePaths(course) {
        var manifest = getManifest();
        $ = manifest.dom;
        resources = $('manifest resources resource[d2l_2p0\\:material_type="content"]')
            .map(toHrefCheerio)
            .get()
            .filter(toHtml)
            .filter(toUnique);
        course.log('one single filepath:', resources[0])
        return resources;
    }

    //2. Convert HTML filepaths into a cheerio parsed html file objects
    function htmlFilepathsToHtmlFileObjs(course, fplist) {
        var arrayofHtmlFileObjs = fplist.reduce(function (found, htmlFilepath) {
            //map to a new object?? in order to pass the objects and read their doms    
            var file = course.content.find(function (file) {
                // return that found file object
                return file.name === htmlFilepath;
            });
            if (file) {
                htmlFileObj = {};
                htmlFileObj.path = file.path;
                htmlFileObj.dom = file.dom;
                found.push(htmlFileObj);
            }
            course.log('converted file to cheerio object:', file)
            return found;
        }, []);
        return arrayofHtmlFileObjs;
    }
    //4. Find more HTML filepaths that are linked to from the other HTML DOMs
    function findMoreHtmlFilepaths(arrayofHtmlFileObjs) {
        //reduce array of htmlFileObjs to get ALL hrefs
        filteredHtmlFilepathStrings = arrayofHtmlFileObjs.reduce(function (linksOut, htmlFileObj) {
                return linksOut.concat(htmlFileObj.dom('a').map(toHrefCheerio).get());
            }, [])
            .filter(toUnique)
            //filter to internal links
            .filter(function (url) {
                var myUrl = URL.parse(url);
                return myUrl.hostname === null;
            })
            .filter(toHtml)
            //map href BACK to array of HtmlFilepaths
            .map(function (htmlFilepath) {
                return decodeURI(htmlFilepath);
            });
        if (filteredHtmlFilepathStrings.length == 0) {
            course.message('No more extra filepaths were found. Continue with conversion.');
            stepCallback(null, course);
        } else {
            var obj = {
                message: 'link to another html file called',
                filename: filteredHtmlFilepathStrings[0]
            }
            course.log('File Object', obj);
        }
        return filteredHtmlFilepathStrings;
    }
    //5. Remove HTML filepaths from newly found html filepath strings that are known
    function removeKnownFilepaths(arrayOfHtmlFileObjs, usedHtmlFilepaths) {
        function findKnown(filepath) {
            return usedHtmlFilepaths.every(function (usedFilepath) {
                return usedFilepath !== filepath.path;
            })
        }
        return arrayOfHtmlFileObjs.filter(findKnown);
    }
    //3.Record the newly found, not currently on the usedHtmlFilepath list
    function getKnownFilepaths(filteredListOfFileObjs) {
        //converting the object into its path so it can be added to the list
        var paths = filteredListOfFileObjs.map(htmlFileObjToPath);
        course.log('recorded filepath obj:', filteredListOfFileObjs[0])
        return paths;
    }

    function crawlContent(course, fplist) {
        var usedHtmlFilepaths = [],
            htmlFilepathObjs,
            moreHtmlFilepaths,
            filteredListOfFileObjs;

        //2. Convert HTML filepaths into a cheerio parsed html file objects
        htmlFilepathObjs = htmlFilepathsToHtmlFileObjs(course, fplist);
        //3.Record the paths we found
        usedHtmlFilepaths = getKnownFilepaths(htmlFilepathObjs);

        //4. Find more HTML filepaths that are linked to from the other HTML DOMs
        moreHtmlFilepaths = findMoreHtmlFilepaths(htmlFilepathObjs);

        //5. Remove HTML filepaths from newly found html filepath strings that are known
        filteredListOfFileObjs = removeKnownFilepaths(moreHtmlFilepaths, usedHtmlFilepaths);

        if (filteredListOfFileObjs.length > 0) {
            /*course.message('Starting Round #' + `${printRound(1)}`);*/
            //because there are new filepaths, crawl that content for more html filepaths
            usedHtmlFilepaths = usedHtmlFilepaths
                .concat(crawlContent(course, filteredListOfFileObjs))
                //make the list unique
                .filter(toUnique);
        }
        return usedHtmlFilepaths;
    }
    //1. Get List of absolute filepaths in the manifest
    var fplist = getManifestHtmlFilePaths(course),
        usedHtmlFilepaths = [],
        filteredHtmlFilepathStrings;
    //start crawling content
    usedHtmlFilepaths = crawlContent(course, fplist);
    var nonUsedFiles = course.content.filter(function (file) {
        return !usedHtmlFilepaths.includes(file.name);
    });
    //to make a different function pass an array of strings instead of objs
    nonUsedFiles = nonUsedFiles.map(file => file.name);
    //helper function for course.newInfo stuff
    function toTitle(filepaths) {
        return filepaths.map(function (path) {
            return pathLib.basename(path);
        });
    }
    var allUsedFiles = toTitle(usedHtmlFilepaths),
        allUnusedFiles = toTitle(nonUsedFiles);

    course.newInfo('nonUsedFiles', allUnusedFiles);
    course.newInfo('usedFiles', allUsedFiles);
    stepCallback(null, course);
}
