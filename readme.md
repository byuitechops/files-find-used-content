# Find Used Content
### *Package Name*: files-find-used-content
### *Child Type*: pre import
### *Platform*: all
### *Required*: Required

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose
The purpose of this program is to find files that are not in content view in d2l but are still used in the course in order to prevent deleting things that are being used in the course.

## How to Install

```
npm install files-find-used-content
```

## Outputs

| Option | Type | Location |
|--------|--------|-------------|
|Used File| Object | course.log|
|Used Files| Array | course.newInfo|
|Unused File| Object | course.log|
|Unused Files| Array | course.newInfo|

## Process

Describe in steps how the module accomplishes its goals.
1. Finds all used files in a given course
2. Reads the files from the and looks for links to other files, images, documents, audio/video files, etc
3. Follows links to html, reads that html to look for more links to html, images, etc.
4. Keeps doing this until no more files are linked to
5. Uniques pages
6. Compares two arrays to find what files are left that haven't been found already
7. course.log's all the used files separate from the unused files.

## Log Categories

List the categories used in logging data in your module.

- "Used Files"
- "Unused Files"

## Expectations

This preImport child module finds all the content (html files, images, documents, other files) that is used in a given D2L course.