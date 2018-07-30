const canvas = require('canvas-api-wrapper');
const cheerio = require('cheerio');

module.exports = (courseObject, stepCallback) => {

    (async () => {

        function identifyFileLinks(acc, item) {
            var fileId;
            if (item.constructor.name !== 'ModuleItem' && item.constructor.name !== 'Module' && item.getHtml()) {
                var $ = cheerio.load(item.getHtml());
                var elements = [...$('[href]').get(), ...$('[src]').get()];
                elements.forEach(el => {
                    let link = '';

                    if ($(el).attr('href')) {
                        link = $(el).attr('href');
                    } else {
                        link = $(el).attr('src');
                    }

                    if (link.includes('/files/')) {
                        fileId = link.split('/files/')[1].split('/')[0];
                    }

                    if (fileId && !acc.includes(fileId)) {
                        courseObject.log('Used Files', {
                            'File ID': fileId
                        });
                        acc.push(fileId);
                    }
                });
            } else if (item.constructor.name === 'ModuleItem' && item.type === 'File') {
                fileId = item.content_id;
                if (fileId && !acc.includes(fileId)) {
                    courseObject.log('Used Files', {
                        'File ID': fileId
                    });
                    acc.push(fileId);
                }
            }
            return acc;
        }

        var course = canvas.getCourse(courseObject.info.canvasOU);

        await course.getComplete()

        let allItems = course.getFlattened()

        let usedFiles = allItems.reduce(identifyFileLinks, []);

        courseObject.info.unusedFiles = course.files.reduce((acc, file) => {
            if (!usedFiles.includes(file.getId())) {
                return [...acc, file.getTitle()];
            } else {
                return acc;
            }
        }, []);

        stepCallback(null, courseObject);
    })();

};