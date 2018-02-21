/*eslint-env node, es6*/

const pathLib = require('path'),
    URL = require('url');
//need to update function comments and documentation
/*Take a course object and return a list (array) of content pages that are used in the course. */
module.exports = (course, stepCallback) => {
    var $;
    var docExts = ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.csv', '.odt', '.ods', '.txt', '.dat', '.log', '.mdb', '.sav', '.sql', '.tar',
            '.xlr', '.wpd', '.wks', '.wps', '.xlsm', '.rtf', '.xps', '.ppt', '.pptx', '.pps', '.slk',
        ],
        imgExts = ['.png', '.jpeg', '.gif', '.bmp', '.ai', '.ico', '.jpg', '.ps', '.psd', '.svg', '.tif', '.tiff'],
        audVidExts = ['.avi', '.wmv', '.mpg', '.mpeg', '.swf', '.mov', '.mp4', '.aif', '.cda', '.mid', '.midi', '.mp3', '.wav', '.ogg',
            '.wma', '.wpl'
        ];
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
    /*filter out quicklinks, they don't need to be accounted for */
    function noQuicklink(path) {
        if (!path.includes('quickLink')) {
            return path;
        }
    }
    var start = 1;

    function printRound(n) {
        start = start + n;
        console.log('Starting Round #', start);
    }
    /*sorts hrefs to get used content, not just html filepaths */
    function sortHrefs(hrefs) {
        hrefs.forEach(function (href) {
            var ext = pathLib.extname(href),
                name = pathLib.basename(href);
            if (imgExts.includes(ext)) {
                courseImages.push({
                    name: href,
                    ext: name
                });
            } else if (docExts.includes(ext)) {
                courseDocs.push({
                    name: href,
                    ext: name
                });
            } else if (audVidExts.includes(ext)) {
                courseVids.push({
                    name: href,
                    path: name
                });
            } else if (ext !== '.html') {
                course.warning('file type not recognized ' + href);
            }
        });
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
            //map to files in order to pass the objects and read their doms    
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
        //need to write a separate function for css files and js files
        //reduce array of htmlFileObjs to get ALL hrefs
        filteredHtmlFilepathStrings = arrayofHtmlFileObjs
            .reduce(function (htmlLinksOut, htmlFileObj) {
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
        //retrieve image tags and add them to courseImages
        var imageTags = arrayofHtmlFileObjs.reduce(function (imgsOut, fileObj) {
                return imgsOut.concat(fileObj.dom('img').get());
            }, [])
            .filter(toUnique);
        imageTags.forEach(function (image) {
            image = $(image);
            var src = image.attr('src'),
                imageTitle = pathLib.basename(src);
            courseImages.push({
                name: imageTitle,
                path: src
            });
        });
        //get other file types like docs, videos, etc and add them to courseFiles
        var courseFiles = arrayofHtmlFileObjs.reduce(function (imgsOut, fileObj) {
                return imgsOut.concat(fileObj.dom('a').map(toHrefCheerio).get());
            }, [])
            .filter(function (url) {
                var myUrl = URL.parse(url);
                return myUrl.hostname === null;
            })
            .filter(toUnique)
            .filter(noQuicklink);
        sortHrefs(courseFiles);
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
        courseImages = [],
        courseDocs = [],
        courseVids = [],
        nonUsedFiles;

    //start crawling content
    usedHtmlFilepaths = crawlContent(course, fplist);
    // wrapItUp(usedHtmlFilepaths);
    wrapItUp(usedHtmlFilepaths);

    function wrapItUp(usedHtmlFilepaths) {
        var allFiles = usedHtmlFilepaths.map(function (fp) {
            var filename = pathLib.basename(fp);
            return {
                name: filename,
                path: fp
            };
        });
        //put all the used images, docs and audio/video file objects to allFiles
        allFiles = allFiles.concat(courseImages, courseDocs, courseVids);
        var codeFilesExts = ['.xml', '.js', '.css'];

        nonUsedFiles = course.content.filter(function (file) {
            var ext = file.ext;
            //don't enter the checking phase if it is a code file as well as don't keep it in nonusedFiles
            if (codeFilesExts.includes(ext)) {
                return false;
            }
            //this checking phase needs to work
            for (var i = 0; i < allFiles.length - 1; i++) {
                if (allFiles[i].name === file.name) {
                    return false;
                }
            }
        });
        // console.log('USED', allFiles);
        // console.log('UNUSED', nonUsedFiles);
        // debugger;
        nonUsedFiles.forEach(unusedFile => {
            course.log('Unused Files', {
                'Name': unusedFile.name,
                'Exported Path': unusedFile.path
            });
        });
        allFiles.forEach(usedFile => {
            if (!usedFile.path) {
                console.log(course.warning('this file does not have a path property: ' + usedFile));
            }
            course.log('Used Files', {
                'Name': usedFile.name,
                'Exported Path': usedFile.path
            });
        });
    }
    nonUsedFiles = nonUsedFiles.map(file => file.name);
    course.newInfo('usedFiles', usedHtmlFilepaths);
    course.newInfo('nonUsedFiles', nonUsedFiles);
    stepCallback(null, course);
};