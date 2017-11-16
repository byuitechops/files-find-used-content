/*eslint-env node, es6*/
var async = require('async'),
    cheerio = require('cheerio'),
    pathLib = require('path'),
    URL = require('url');

/*Take a course object and return a list (array) of content pages that are used in the course. */
module.exports = (course, stepCallback) => {
    course.addModuleReport('crawlTheContent');
    var $;
    /*reusable functions*/
    function toHtml(path) {
        return pathLib.extname(path) === '.html';
    }

    function toUnique(path, i, filteredArray) {
        return filteredArray.indexOf(path) === i;
    }

    function toHrefCheerio(i, resource) {
        return $(resource).attr('href')
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
        //console.log(resources);
        course.success('crawlTheContent', 'Successfully FOUND all filepaths in manifest')
        return resources;
    }

    //2. Convert HTML filepaths into a cheerio parsed html file objects
    function htmlFilepathsToHtmlFileObjs(course, fplist) {
        //loop through course.content.path and "htmlFilepath"s 
        var sortingHat = {
                found: [],
                notFound: []
            },
            arrayofHtmlFileObjs = fplist.reduce(function (found, htmlFilepath) {
                //map to a new object?? in order to pass the objects and read their doms
                // course.content.find() on all of the files in the course to find the one file
                var file = course.content.find(function (file) {
                    // return that found file object
                    return file.name === htmlFilepath;
                });

                if (file) {
                    htmlFileObj = {};
                    htmlFileObj.path = file.path;
                    htmlFileObj.dom = file.dom;
                    found.push(htmlFileObj)
                    console.log("FOUND:", file.name)
                }

                return found;
            }, []);
        //console.log('NOT FOUND', notFounds);
        course.success('crawlTheContent', 'successfully CONVERTED all filepaths to objects')
        //console.log(arrayofHtmlFileObjs);
        return arrayofHtmlFileObjs;
    }
    //3. Find more HTML filepaths that are linked to from the other HTML DOMs
    function findMoreHtmlFilepaths(arrayofHtmlFileObjs) {
        //reduce array of htmlFileObjs to get ALL hrefs
        var filteredHtmlFilepathStrings = arrayofHtmlFileObjs.reduce(function (linksOut, htmlFileObj) {
                return linksOut.concat(htmlFileObj.dom('a').map(toHrefCheerio).get());
            }, [])
            //unique 
            .filter(toUnique)
            //filter to internal links only
            .filter(function (url) {
                var myUrl = URL.parse(url);
                return myUrl.hostname === null;
            })
            //filter to HTML files
            .filter(toHtml)
        console.log(filteredHtmlFilepathStrings)
        /*
        //map href BACK to HtmlFilepaths
        .map(function (htmlFilepath) {
            return htmlFilepath.toString();
        });*/
        //console.log('array of file strings', filteredHtmlFilepathStrings);
        course.success('crawlTheContent', 'successfully FOUND MORE html files');
        return filteredHtmlFilepathStrings;
    }
    //4. Remove HTML filepaths from newly found html filepath strings that we already have
    function removeKnownFilepaths(arrayOfHtmlFilepathStrings, usedHtmlFilepaths) {
        function findKnown(filepath) {
            return usedHtmlFilepaths.every(function (usedFilepath) {
                return usedFilepath !== filepath;
            })
        }
        return arrayOfHtmlFilepathStrings.filter(findKnown);
    }
    //5.Record the newly found, not currently on the usedHtmlFilepath list
    function recordKnownFilepaths(filteredArrayofHtmlFilepaths, usedHtmlFilepaths) {
        usedHtmlFilepaths = usedHtmlFilepaths.concat(filteredArrayofHtmlFilepaths)
        course.success('crawlTheContent', 'successfully ADDED filepaths to the list')
    }

    function crawlContent(course, fplist, usedHtmlFilepaths) {
        var htmlFilepathObjs,
            moreHtmlFilepaths,
            newusedFilepaths;

        htmlFilepathObjs = htmlFilepathsToHtmlFileObjs(course, fplist);

        moreHtmlFilepaths = findMoreHtmlFilepaths(htmlFilepathObjs);
        newusedFilepaths = removeKnownFilepaths(moreHtmlFilepaths, usedHtmlFilepaths);

        if (newusedFilepaths.length > 0) {
            recordKnownFilepaths(newusedFilepaths, usedHtmlFilepaths)
            crawlContent(course, newusedFilepaths, usedHtmlFilepaths)
        }
        course.success('crawlTheContent', 'findUsedContent: SUCCESS!')
    }
    var usedHtmlFilepaths = [];
    //call step1 getManifestHtmlFilepaths
    var fplist = getManifestHtmlFilePaths(course);
    //start crawling content
    crawlContent(course, fplist, usedHtmlFilepaths)
    course.throwErr('crawlTheContent', error)
    //console.log(course)
    stepCallback(null, course)
}
