const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
const path = require("path");

(async() => {
    // Get all Doubtfire-web file paths
    const allFiles = getAllFiles("../thoth-tech/doubtfire-deploy/doubtfire-web/src/app");
    // Get all AngularJS component paths
    const allAngularJSComponents = getAllAngularJSComponents(allFiles);

    let dict = {};

    // For each component path
    for (const componentPath of allAngularJSComponents) {
        // Get component name
        const filename = componentPath.split("/").pop();
        // Get camelised version
        const camelised = camelise(filename.split(".").shift());

        console.log(`[${filename}]`);

        /**
         * CoffeeScript search
         */

        // Get search terms for CoffeeScript search
        const coffeeSearchTerms = getCoffeeScriptSearchTerms(camelised);
        // Get file paths where search terms were found in
        const filePathsFoundIn = await searchAllFiles(allAngularJSComponents, coffeeSearchTerms);

        dict[componentPath] = filePathsFoundIn;

        /**
         * HTML tag search
         */

    }

    // Write CoffeeScript output to file
    fs.writeFile("./coffeescript.txt", JSON.stringify(dict, null, 2), (err) => {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });

})();

function getCoffeeScriptSearchTerms(camelcaseName) {
    return [
        `${camelcaseName}\\.`, 
        `\\(${camelcaseName}, `,
        ` ${camelcaseName}, `,
        `, ${camelcaseName}\\)`,
    ];
}

function camelise(s) {
    return s.replace(/-./g, x => x[1].toUpperCase());
}

function getAllAngularJSComponents(allFiles) {
    let allAngularJSComponents = [];

    allFiles.forEach(path => {
        const filename = path.split("/").pop();

        // Define requirements for what an Angular JS component is
        if (
            filename && 
            !allAngularJSComponents.includes(filename) && 
            filename.includes(".coffee")
            ) {
            allAngularJSComponents.push(path);
        }
    });

    return allAngularJSComponents;
}

function getAllFiles(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } 
        else {
            arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
        }
    })

    return arrayOfFiles
}

async function searchAllFiles(files, searchTerms) {
    const foundInFiles = [];

    for (const filePath of files) {
        await searchFile(filePath, searchTerms)
            .then(res => {
                if (res.length > 0) {
                    foundInFiles.push(res);
                }
            });
    }

    return foundInFiles;
}

function searchFile(path, searchTerms) {
    return new Promise(async (resolve) => {
        const inStream = fs.createReadStream(path);
        const outStream = new stream;
        const rl = readline.createInterface(inStream, outStream);
        const regEx = new RegExp(searchTerms.join('|'));
        let foundPath = "";

        rl.on('line', function (line) {
            // If any search term is found on any line, return current file path
            if (line && foundPath != path && line.search(regEx, 'i') >= 0) {
                foundPath = path;
            }
        });

        rl.on('close', function () {
            resolve(foundPath);
        });
    })
}