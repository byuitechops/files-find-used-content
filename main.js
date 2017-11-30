/*eslint-env node, es6*/
var async = require('async'),
    cheerio = require('cheerio'),
    pathLib = require('path'),
    URL = require('url');

/*Take a course object and return a list (array) of content pages that are used in the course. */
module.exports = (course, stepCallback) => {
    course.addModuleReport('crawlTheContent');
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
    /*print the round of checking it's on*/
    var start = 1;

    function printRound(n) {
        start = start + n;
        console.log('Starting Round #', start);
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
        course.success('crawlTheContent', 'Successfully FOUND all filepaths in manifest')
        //console.log('resources---', resources, '---');
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
            return found;
        }, []);
        course.success('crawlTheContent', 'successfully CONVERTED all filepaths to objects')
        return arrayofHtmlFileObjs;
    }
    //4. Find more HTML filepaths that are linked to from the other HTML DOMs
    function findMoreHtmlFilepaths(arrayofHtmlFileObjs) {
        //reduce array of htmlFileObjs to get ALL hrefs
        var filteredHtmlFilepathStrings = arrayofHtmlFileObjs.reduce(function (linksOut, htmlFileObj) {
                return linksOut.concat(htmlFileObj.dom('a').map(toHrefCheerio).get());
            }, [])
            .filter(toUnique)
            //filter to inturnal links
            .filter(function (url) {
                var myUrl = URL.parse(url);
                return myUrl.hostname === null;
            })
            //keep only links that end in .html
            .filter(toHtml)
            //map href BACK to array of HtmlFilepaths
            .map(function (htmlFilepath) {
                return decodeURI(htmlFilepath);
            });
        console.log('filtered Html Strings', filteredHtmlFilepathStrings)
        course.success('crawlTheContent', 'successfully FOUND MORE html files');
        return filteredHtmlFilepathStrings;
    }
    //5. Remove HTML filepaths from newly found html filepath strings that are known
    function removeKnownFilepaths(arrayOfHtmlFileObjs, usedHtmlFilepaths) {
        function findKnown(filepath) {
            return usedHtmlFilepaths.every(function (usedFilepath) {
                return usedFilepath !== filepath.path;
            })
        }
        /*Trying to get the filepaths to be recorded*/
        return arrayOfHtmlFileObjs.filter(findKnown);
    }
    //3.Record the newly found, not currently on the usedHtmlFilepath list
    function getKnownFilepaths(filteredListOfFileObjs) {
        //converting the object into its path so it can be added to the list
        var paths = filteredListOfFileObjs.map(htmlFileObjToPath);
        //console.log('added: ', paths);
        course.success('crawlTheContent', 'successfully ADDED filepaths to the list')
        return paths;
    }

    function crawlContent(course, fplist) {
        var usedHtmlFilepaths = [],
            htmlFilepathObjs,
            moreHtmlFilepaths,
            filteredListOfFileObjs;
        debugger;

        //2. Convert HTML filepaths into a cheerio parsed html file objects
        htmlFilepathObjs = htmlFilepathsToHtmlFileObjs(course, fplist);
        //3.Record the paths we found
        usedHtmlFilepaths = getKnownFilepaths(htmlFilepathObjs);

        //4. Find more HTML filepaths that are linked to from the other HTML DOMs
        moreHtmlFilepaths = findMoreHtmlFilepaths(htmlFilepathObjs);

        //5. Remove HTML filepaths from newly found html filepath strings that are known
        filteredListOfFileObjs = removeKnownFilepaths(moreHtmlFilepaths, usedHtmlFilepaths);
        console.log('filteredListOfFileObjs2:', filteredListOfFileObjs)
        if (filteredListOfFileObjs.length > 0) {
            //because there are new filepaths, crawl that content for more html filepaths
            printRound(1);
            usedHtmlFilepaths = usedHtmlFilepaths
                .concat(crawlContent(course, filteredListOfFileObjs.map(htmlFileObjToPath)))
                //make the list unique
                .filter(toUnique);

        }

        return usedHtmlFilepaths;
    }
    //1. Get List of absolute filepaths in the manifest
    var fplist = getManifestHtmlFilePaths(course),
        usedHtmlFilepaths = [];
    //start crawling content
    usedHtmlFilepaths = crawlContent(course, fplist)
    console.log("end:", usedHtmlFilepaths)
    //course.throwErr('crawlTheContent', error)
    stepCallback(null, course)
    course.success('crawlTheContent', 'findUsedContent: SUCCESS!')
}
