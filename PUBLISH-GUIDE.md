# Publishing Guide

This document outlines the steps you need to take before publishing your fork to npm.

## Pre-publishing Checklist

1. **Update the package.json**
   - [x] Change the package name to your own (avoid using the original namespace)
   - [x] Update the description to indicate it's a fork
   - [x] Update repository, bugs, and homepage URLs
   - [x] Update author information
   - [x] Add yourself to contributors list

2. **License and Attribution**
   - [x] Keep the original Apache 2.0 license
   - [x] Create a NOTICE file with attribution to the original project
   - [x] Update README.md to clearly indicate this is a fork with attribution
   - [ ] Run the update-modified-files.js script to add modification notices to any files you've changed

3. **Personalize the Modified Files List**
   - [x] Edit update-modified-files.js to list all source files you have modified
   - [ ] Execute the script: `node update-modified-files.js`

4. **Final Steps**
   - [x] Replace placeholder information with actual data
   - [ ] Run tests to ensure functionality: `npm test`
   - [ ] Update your GitHub repository description to indicate it's a fork

5. **Publishing to npm**
   - [ ] Login to npm: `npm login`
   - [ ] Publish your package: `npm publish`

## Apache 2.0 License Requirements

When modifying and redistributing code under the Apache 2.0 license, you must:

1. Include a copy of the Apache 2.0 license (preserved in LICENSE.md)
2. Include notices that files were modified (handled by update-modified-files.js)
3. Retain all copyright, patent, trademark, and attribution notices from the original code
4. Include a NOTICE file if one exists in the original project, with attribution

## Remember

The Apache 2.0 license is permissive and allows you to:
- Use the code for commercial purposes
- Distribute modified versions
- Distribute under a different license (though the original code still carries the Apache 2.0 license)

However, you must attribute the original work as specified in the license. 