# Find Used Content

This child module runs during preImport part of the d2l-conversion-tool. This program does the following in order:
- Finds all used files in a given course
- Reads the files and looks for links to other files
- Follows those links and looks for more
- Keeps doing this until no more files are linked to
- Removes any known pages already linked to previously
- Gives the course object a new property that contains a list of files used and unused that is later used in dispersing files into folders in Canvas

The purpose of this program is to find files that are not in content view in d2l but are still used in the course in order to prevent deleting things that are being used in the course.