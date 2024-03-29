var fs = require('fs');
var traces,
    isVisited = {},
    cityList;
/**
 *Making array containing visited stops and distance to Start
* @param {obj} parsed file
*/
function prepareIsVisitedArray(jsonFile) {
    for (var k = 0; k < jsonFile.nodes.length; k++) {
        isVisited[jsonFile.nodes[k].id] = { "isVisited": false, "value": undefined };
    }
}
/**
 *Making array containing visited stops and distance to Start
* @param {obj} parsed file
*/
function clearIsVisitedArray() {
    for (var k = 0; k < isVisited.length; k++) {
        isVisited[k] = { "isVisited": false, "value": undefined };
    }
}
/**
 * making traces bi-directional
 * @param {obj} parsed file
 * @returns {null}
 */
function makeBidirectional(jsonFile) {
    traces = jsonFile["links"];
    let len = traces.length;
    for (var i = 0; i < len; i++) {
        let el = traces[i];
        traces.push({
            "distance": el.distance, "source": el.target, "target": el.source
        });
    }
}
/*
.json file must have:
    - nodes:
        list containg id and name
    - links:
        list containg distance source and target
    - id in links must be same in nodes
    -
*/
function checkFile(parsedFile) {
    let nodes, links, el;
    try {
        if (parsedFile.nodes === undefined) {
            throw ("No nodes in file")
        }
        if (parsedFile.links === undefined) {
            throw ("No links in file")
        }
        nodes = parsedFile.nodes;
        links = parsedFile.links;
        if (nodes.length == 0 || links.length == 0) {
            throw ("Empty element list");
        }
        for (let k = 0; k < nodes.length; k++) {
            if (nodes[k].id === undefined) {
                throw ("No id in " + k + "\'s element");
            }
            if (nodes[k].stop_name === undefined) {
                throw ("No stop_name in " + k + "\'s element");
            }
        }
        for (let k = 0; k < links.length; k++) {
            if (links[k].distance === undefined) {
                throw ("No distance in " + k + "\'s element");
            }
            if (links[k].source === undefined) {
                throw ("No source in " + k + "\'s element");
            }
            if (links[k].target === undefined) {
                throw ("No target in " + k + "\'s element");
            }
        }
    } catch (e) {
        throw (e)
    }
}


/**
 * Initialize .json file
 * @param {string} filename name of the .json file
 */
function Init(filename) {
    //solvro_city.json
    let f = fs.readFileSync(filename, "utf-8");
    if (!f) {
        throw ("Empty .json file");
    }
    var jsonFile;
    try {
        jsonFile = JSON.parse(f);
    }
    catch (e) {
        throw (e);
    }
    checkFile(jsonFile);
    prepareIsVisitedArray(jsonFile);
    makeBidirectional(jsonFile);
    cityList = jsonFile.nodes;
}
/**
 * Define begining stop
 * @param {string} start id of the starting stop
 * @returns {number} if everything ok returns 0 else 1
*/
function initializeDistances(start) {
    clearIsVisitedArray();
    for (var i = 0; i < traces.length; i++) {
        if (traces[i].source == start) {
            isVisited[traces[i].target].value = traces[i].distance;
        }
    }
    markAsVisited(start);
}
/**
 * Searching through traces array to find the shortest distance to next stop
* @param {string} start type: string id of the starting stop
*/
function findDistances(target) {
    var previousDistace = isVisited[target].value;
    for (var i = 0; i < traces.length; i++) {
        var found = traces[i];
        if (found.source == target) {
            let distanceToStart = isVisited[found.target].value;
            let measuredDistance = found.distance + previousDistace;
            if (distanceToStart == undefined || (distanceToStart > measuredDistance)) {
                isVisited[found.target].value = measuredDistance;
            }
        }
    }
    markAsVisited(target);
}
/**
 *
 * @param {string} target marking as visited in isVisited array
 * @returns {number} retuns 1
 */
function markAsVisited(target) {
    if (isVisited[target].isVisited !== undefined) {
        isVisited[target].isVisited = true;
    }
    else {
        throw "Invalid target";
    }
}
/**
 * @returns {string} id of the next city to 'visit'|false if thre is no city left
 */
function chooseSubTarget() {
    for (k in isVisited) {
        if (isVisited[k].isVisited == false && isVisited[k].value != undefined) {
            isVisited[k].isVisited = true;
            return k
        }
    }
    return false;
}
/**
 * @param {string} Start id of first element to measure from
 * @returns {Array} list of distances between Start and all stops
 */
function measureAllDistances(start) {
    initializeDistances(start);
    var nextCity = chooseSubTarget();
    while (nextCity) {
        findDistances(nextCity);
        nextCity = chooseSubTarget()
    }
    return isVisited;
}
/**
 * @returns list containg stops names and ids
 */
function cityNames() {
    return cityList;
}
/**
 * @param {string} name name of the stop
 * @returns {string|boolean} id of the stop if is in the list; false if found nothing
 */
function nameToId(name) {
    let l = cityNames();
    for (var k = 0; k < l.length; k++) {
        let el = l[k];
        if (el["stop_name"] === name) {
            return el["id"]
        }
    }
    throw "No element with specific name";
}
/**
 * @param {string} id id of the stop
 * @returns {string|boolean} name of the stop if is in the list; false if found nothing
 */
function idToName(id) {
    let l = cityNames();
    for (var k = 0; k < l.length; k++) {
        let el = l[k];
        if (el["id"] + "" === id) {
            return el["stop_name"]
        }
    }
    throw "No element with specific id";
}
/**
 * @param {string} start  id of staring stop
 * @param {string} stop id of ending stop
 * @returns {string|number} returns number if there is route between stops; returns string msg if not
 */
function distanceBetweenById(start, end) {
    if (!idToName(start) || !idToName(end)) {
        throw "No stop with specyfic id, check the list containg stops";
        return;
    }
    let dist = measureAllDistances(start);
    var resultObj = {
        "stops": [{
            "name": idToName(start)
        },
        {
            "name": idToName(end)
        }
        ],
        "distance": 0
    }
    if (dist[end] && dist[start]) {
        //alghoritm measres distance if start and end are the same stop
        if (start === end) {
            resultObj.distance = 0;
            return resultObj;
        }
        if (dist[end].value !== undefined) {
            resultObj.distance = dist[end].value;
            return resultObj;
        }
        else {
            //some of generated graphs hadn't routs to every single stop
            throw "No route to the stop";
            return;
        }
    }
    else {
        throw "No stop with specyfic id, check the list containg stops";
        return;
    }
}
/**
 *
 * @param {string} start name of staring stop
 * @param {string} stop name of ending stop
 * @returns {string|number} number if there is route between stops; returns string msg if not
 */
function distanceBetweenByName(start, end) {
    let startId = nameToId(start);
    let endId = nameToId(end);
    if (startId == false || endId == false) {
        throw "No stop with specyfic name, check the list containg stops";
    }
    let dist = measureAllDistances(start);
    if (dist[end] && dist[start]) {
        //alghoritm measures distance even if start and end are the same stop
        if (start === end) {
            return 0;
        }
        if (dist[end].value !== undefined) {
            return dist[end].value
        }
        else {
            //some of generated graphs hadn't routs to every single stop
            throw "No route to the stop"
        }
    }
    else {
        throw "No stop with specyfic name, check the list containg stops"
    }
}
module.exports.loadFile = Init;
module.exports.cityNames = cityNames;
module.exports.distById = distanceBetweenById;
module.exports.distByName = distanceBetweenByName;