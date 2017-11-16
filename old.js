/*eslint-env node, es6*/

/*crawl the manifest file to find which pages are in used and which are unused in the given course*/
var async = require('async')
var cheerio = require('cheerio')
var pathLib = require('path')

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

//to be called by the conversion tool
module.exports = (course, stepCallback) => {
    course.addModuleReport('crawlContent');
    // read the xml file
    var manifest = course.content.find(function (file) {
        //hopefully it can find the manifest
        if (file.name === 'imsmanifest.xml') {
            return file;
        }
    });
    //the manifest.dom is the body of the xml file in zip folder
    fileGuts = manifest.dom;
    $ = cheerio.load(fileGuts);

    //function 1 - xml
    function toHtml(path) {
        return pathLib.extname(path) === '.html';
    }

    function toUnique(path, i, filteredArray) {
        return filteredArray.indexOf(path) === i;
    }

    function toHrefCheerio(i, resource) {
        return $(resource).attr('href')
    }

    //function 1 - xml
    var findUsedContent = function ($) {
        /*this returns an array of unique html content items*/
        var resources = $('manifest resources resource[d2l_2p0\\:material_type="content"]')
            .map(toHrefCheerio)
            .get()
            .filter(toHtml)
            .filter(toUnique);

        course.success('crawlContent', 'successfully found all hrefs to content items')
        return resources;
    }
    var htmlFilepathNames = findUsedContent($);

    //function 2 - zip file (course.content??)
    var internalLinks = function (findUsedContent) {
        //function that filters hrefs for known content and external links
        var internalLinks = findUsedContent
            .filter(function (link) {
                return link.includes('/content/enforced/');
            });
        return internalLinks;
        course.success('crawlContent', 'successfully filtered external links out')
    };
    var linksToFilter = internalLinks(htmlFilepathNames)

    //recursive things
    var modifyList = function (filteredLinks) {
        //convert paths into the actual html files

        //search html for hrefs that are external
        //if it is in findUsedContent, go look through it's content??internalLinks(links)
        //else if linksToFilter gives us more paths (that don't exist in findUsedContent, push to original findUsedContent
        //course.success('crawlContent', 'successfully searched content & found all links to other content')
        //findUnused(totalFilesUsed)
    }
    modifyList(linksToFilter)

    //find the unused files compated to original filteredList, returns used and unused content pages
    function findUnused(originalList, filteredList) {
        course.success('crawlContent', 'successfully sorted unused files')
    }
    var originalContentList = course.content;
    var filteredContentList = findUnused(originalContentList, filteredContentList)
    return filteredContentList;
};
