/*eslint-env node, es6*/
/*Take a course object and return a list (array) of content pages that are used in the course. */
module.exports = (course, stepCallback) => {
    course.addModuleReport('crawlTheContent');
    var async = require('async'),
        cheerio = require('cheerio'),
        pathLib = require('path')
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
    function getManifest(course) {
        var manifest = course.content.find(function (file) {
            if (file.name === 'imsmanifest.xml') {
                return file;
            }
        })
        return manifest;
    }

    //1. Get List of absolute filepaths in the manifest
    function getManifestHtmlFilePaths(course) {
        var manifest = getManifest(course),
            fileGuts = manifest.dom,
            $ = cheerio.load(fileGuts),
            resources = $('manifest resources resource[d2l_2p0\\:material_type="content"]')
            .map(toHrefCheerio)
            .get()
            .filter(toHtml)
            .filter(toUnique);


        course.success('crawlTheContent', 'successfully found all filepaths in manifest')
        return resources;
    }

    //2. Convert HTML filepaths into a cheerio parsed html file objects
    function htmlsFilepathsToHtmlFileObjs(course, fplist) {
        var arrayofHtmlFileObjs = fplist.map(function (htmlFile) {
            //map to a new object in order to pass the objects and read their doms
            htmlFileObj = {};
            htmlFileObj.path = htmlFile.filepath;
            htmlFileObj.dom = htmlFile.dom;
            return htmlFileObj;
        })
        //loop through course.content.path and "htmlFilepath"s 
        course.success('crawlTheContent', 'successfully converted all filepaths to objects')
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
            //filter to internal links
            .filter(function (link) {
                return link.includes('/content/enforced');
            });
        //filter to HTML files
        var htmlFiles = filteredHtmlFilepathStrings.filter(toHtml)
        //maps href back to HtmlFilepaths
        /*.map(function (htmlObj, i) {
            var htmlFilepathStrings = [];
            htmlFilepathStrings[i] = htmlObj.path;
            return htmlFilepathStrings;

        })*/
        console.log('The HTML files are:', htmlFiles)
        course.success('crawlTheContent', 'successfully found more html files');
        return filteredHtmlFilepathStrings;
    }
    //4. Remove HTML filepaths from newly found html filepath strings that we already have
    function removeKnownFilepaths(arrayOfHtmlFilepathStrings, usedHtmlFilepaths) {
        var filteredArrayofHtmlFilepaths = arrayOfHtmlFilepathStrings.filter(function (filepath) {
            return usedHtmlFilepaths.every(function (usedFilepath) {
                return usedFilepath !== filepath;
            })
        })

        return filteredArrayOfHtmlFilepaths;
    }
    //5.Record the newly found, not currently on the usedHtmlFilepath list
    function recordKnownFilepaths(filteredArrayofHtmlFilepaths, usedHtmlFilepaths) {
        usedHtmlFilepaths = usedHtmlFilepaths.concat(filteredArrayofHtmlFilepaths)
        course.success('crawlTheContent', 'successfully added more filepaths to the list')
    }

    function crawlContent(course, fplist, usedHtmlFilepaths) {
        var htmlFilepathObjs = htmlsFilepathsToHtmlFileObjs(course, fplist),
            moreHtmlFilepaths = findMoreHtmlFilepaths(htmlFilepathObjs),
            newusedFilepaths = removeKnownFilepaths(moreHtmlFilepaths, usedHtmlFilepaths);
        if (newusedFilepaths.length > 0) {
            recordKnownFilepaths(newusedFilepaths, usedHtmlFilepaths)
            crawlContent(course, newusedFilepaths, usedHtmlFilepaths)
        }
        course.success('crawlTheContent', 'findUsedContent: process successful!')
    }
    var usedHtmlFilepaths = [];
    //call step1 getManifestHtmlFilepaths
    var fplist = getManifestHtmlFilePaths(course);
    //start crawling content
    crawlContent(course, fplist, usedHtmlFilepaths)
    course.throwErr('crawlTheContent', error)
    console.log(course)
    stepCallback(null, course)
}
