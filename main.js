/*eslint-env node, es6*/

const pathLib = require('path'),
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
        return $(resource).attr('href');
    }

    function toDocument(path) {
        var ext = pathLib.extname(path),
            filename = pathLib.basename(path);
        if (ext === '.doc' || ext === '.docx' || ext === '.pdf' || ext === '.txt' || ext === '.csv' || ext === '.xlsx' ||
            ext === '.xlsm' || ext === '.slk' || ext === '.xps' || ext == '.rtf') {
            return filename;
        }
    }

    function toVideo(path) {
        var ext = pathLib.extname(path),
            filename = pathLib.basename(path);
        if (ext === '.swf' || ext === '.mp4' || ext === '.mov' || ext === '.wmv' || ext === '.wav' || ext === '.avi' ||
            ext === '.mpg') {
            return filename;
        }
    }
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
    //remove course as a parameter, may need to add it back in
    function getManifestHtmlFilePaths() {
        var manifest = getManifest();
        $ = manifest.dom;
        var resources = $('manifest resources resource[d2l_2p0\\:material_type="content"]')
            .map(toHrefCheerio)
            .get()
            //unfiltered resources should 
            .filter(toHtml)
            .filter(toUnique);
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
                var htmlFileObj = {};
                htmlFileObj.path = file.path;
                htmlFileObj.dom = file.dom;
                found.push(htmlFileObj);
            }
            return found;
        }, []);
        return arrayofHtmlFileObjs;
    }
    //4. Find more HTML filepaths that are linked to from the other HTML DOMs
    function findMoreHtmlFilepaths(arrayofHtmlFileObjs) {
        //reduce array of htmlFileObjs to get ALL hrefs
        filteredHtmlFilepathStrings = arrayofHtmlFileObjs.reduce(function (htmlLinksOut, htmlFileObj) {
                return htmlLinksOut.concat(htmlFileObj.dom('a').map(toHrefCheerio).get());
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
        var images = arrayofHtmlFileObjs.reduce(function (imgsOut, fileObj) {
            return imgsOut.concat(fileObj.dom('img').get());
        }, []);
        images.forEach(function (image) {
            image = $(image);
            var src = image.attr('src'),
                imageTitle = pathLib.basename(src);
            linksToImages.push(imageTitle);
        });
        var videos = arrayofHtmlFileObjs.reduce(function (vidsOut, fileObj) {
                var aTags = fileObj.dom('a');
                return vidsOut.concat(aTags.map(toHrefCheerio).get());
            }, [])
            .filter(toUnique)
            .filter(toVideo);
        videos.forEach(function (video) {
            linksToVids.push(video);
        });
        var documents = arrayofHtmlFileObjs.reduce(function (docsOut, fileObj) {
                return docsOut.concat(fileObj.dom('a').map(toHrefCheerio).get());
            }, [])
            .filter(toUnique)
            .filter(toDocument);
        documents.forEach(function (doc) {
            linkstoDocs.push(doc);
        });

        return filteredHtmlFilepathStrings;
    }
    //5. Remove HTML filepaths from newly found html filepath strings that are known
    function removeKnownFilepaths(arrayOfHtmlFileObjs, usedHtmlFilepaths) {
        function findKnown(filepath) {
            return usedHtmlFilepaths.every(function (usedFilepath) {
                return usedFilepath !== filepath.path;
            });
        }
        return arrayOfHtmlFileObjs.filter(findKnown);
    }
    //3.Record the newly found, not currently on the usedHtmlFilepath list
    function getKnownFilepaths(filteredListOfFileObjs) {
        //converting the object into its path so it can be added to the list
        var paths = filteredListOfFileObjs.map(htmlFileObjToPath);
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
            printRound(1);
            //because there are new filepaths, crawl that content for more html filepaths
            usedHtmlFilepaths = usedHtmlFilepaths
                .concat(crawlContent(course, filteredListOfFileObjs))
                //make the list unique
                .filter(toUnique);
        } else {
            course.message('No more extra filepaths were found.');
        }
        return usedHtmlFilepaths;
    }
    //1. Get List of absolute filepaths in the manifest
    var fplist = getManifestHtmlFilePaths(course),
        usedHtmlFilepaths = [],
        filteredHtmlFilepathStrings,
        linksToImages = [],
        linkstoDocs = [],
        linksToVids = [];
    //start crawling content
    usedHtmlFilepaths = crawlContent(course, fplist);
    var allFiles = usedHtmlFilepaths.map(function (fp) {
        var filename = pathLib.basename(fp);
        return filename;
    });
    linksToImages.forEach(function (image) {
        allFiles.push(image);
    });
    linkstoDocs.forEach(function (doc) {
        allFiles.push(doc);
    });
    linksToVids.forEach(function (vid) {
        allFiles.push(vid);
    });
    // console.log('USED files', allFiles);
    var nonUsedFiles = course.content.filter(function (file) {
        var ext = file.ext;
        if (ext !== '.xml') {
            return !allFiles.includes(file.name);
            //this if statement is not working -- don't want to delete the course css or scripts
        } else if (file.name === 'course.css' || file.name === 'course.js') {
            allFiles.push(file.name);
        }
    });
    nonUsedFiles = nonUsedFiles.map(file => file.name);
    // console.log('UNUSED', nonUsedFiles);
    // Log each unused file --PROBLEM: name and path are undefined
    nonUsedFiles.forEach(unusedFile => {
        course.log('Unused Files', {
            'Name': unusedFile.name,
            'Exported Path': unusedFile.path
        });
    });
    //log all used files to the course obj PROBLEM: name and path are undefined
    allFiles.forEach(usedFile => {
        course.log('Used Files', {
            'Name': usedFile.name,
            'Exported Path': usedFile.path
        });
    });
    course.newInfo('usedFiles', usedHtmlFilepaths);
    course.newInfo('nonUsedFiles', nonUsedFiles);
    stepCallback(null, course);
};