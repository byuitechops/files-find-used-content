const canvas = require('canvas-api-wrapper');
const cheerio = require('cheerio');

module.exports = (course, stepCallback) => {

    (async () => {
        function identifyFileLinks(acc, item) {
            var fileId;

            if (item.getHtml === undefined) {
                course.warn(`Unable to get HTML from ${item}`);
            }

            if (item.constructor.name !== 'ModuleItem' && item.constructor.name !== 'Module' && item.getHtml()) {
                var $ = cheerio.load(item.getHtml());
                var elements = [...$('[href]').get(), ...$('[src]').get()];

                elements.forEach(el => {
                    let link = '';

                    /* != undefined stops this from breaking when href is an empty string */
                    if ($(el).attr('href') != undefined) {
                        link = $(el).attr('href');
                    } else {
                        link = $(el).attr('src');
                    }
                    /* Grab fileID if it's a link to a file */
                    if (link.includes('/files/')) {
                        fileId = link.split('/files/')[1].split('/')[0];
                    }

                    if (fileId && !acc.includes(fileId)) {
                        course.log('Used Files', {
                            'File ID': fileId
                        });
                        acc.push(fileId);
                    }
                });
            } else if (item.constructor.name === 'ModuleItem' && item.type === 'File') {
                fileId = item.content_id;
                if (fileId && !acc.includes(fileId)) {
                    course.log('Used Files', {
                        'File ID': fileId
                    });
                    acc.push(fileId);
                }
            }
            return acc;
        }

        var apiCourse = canvas.getCourse(course.info.canvasOU);

        await apiCourse.getComplete();

        let allItems = apiCourse.getFlattened();

        let usedFiles = allItems.reduce(identifyFileLinks, []);

        course.info.unusedFiles = apiCourse.files.reduce((acc, file) => {
            if (!usedFiles.includes(file.getId())) {
                return [...acc, file.getTitle()];
            } else {
                return acc;
            }
        }, []);

        stepCallback(null, course);
    })();
};