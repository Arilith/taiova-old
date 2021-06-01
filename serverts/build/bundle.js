/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/fast-xml-parser/src/json2xml.js":
/*!******************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/json2xml.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


//parse Empty Node as self closing node
const buildOptions = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js").buildOptions;

const defaultOptions = {
  attributeNamePrefix: '@_',
  attrNodeName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  cdataTagName: false,
  cdataPositionChar: '\\c',
  format: false,
  indentBy: '  ',
  supressEmptyNode: false,
  tagValueProcessor: function(a) {
    return a;
  },
  attrValueProcessor: function(a) {
    return a;
  },
};

const props = [
  'attributeNamePrefix',
  'attrNodeName',
  'textNodeName',
  'ignoreAttributes',
  'cdataTagName',
  'cdataPositionChar',
  'format',
  'indentBy',
  'supressEmptyNode',
  'tagValueProcessor',
  'attrValueProcessor',
];

function Parser(options) {
  this.options = buildOptions(options, defaultOptions, props);
  if (this.options.ignoreAttributes || this.options.attrNodeName) {
    this.isAttribute = function(/*a*/) {
      return false;
    };
  } else {
    this.attrPrefixLen = this.options.attributeNamePrefix.length;
    this.isAttribute = isAttribute;
  }
  if (this.options.cdataTagName) {
    this.isCDATA = isCDATA;
  } else {
    this.isCDATA = function(/*a*/) {
      return false;
    };
  }
  this.replaceCDATAstr = replaceCDATAstr;
  this.replaceCDATAarr = replaceCDATAarr;

  if (this.options.format) {
    this.indentate = indentate;
    this.tagEndChar = '>\n';
    this.newLine = '\n';
  } else {
    this.indentate = function() {
      return '';
    };
    this.tagEndChar = '>';
    this.newLine = '';
  }

  if (this.options.supressEmptyNode) {
    this.buildTextNode = buildEmptyTextNode;
    this.buildObjNode = buildEmptyObjNode;
  } else {
    this.buildTextNode = buildTextValNode;
    this.buildObjNode = buildObjectNode;
  }

  this.buildTextValNode = buildTextValNode;
  this.buildObjectNode = buildObjectNode;
}

Parser.prototype.parse = function(jObj) {
  return this.j2x(jObj, 0).val;
};

Parser.prototype.j2x = function(jObj, level) {
  let attrStr = '';
  let val = '';
  const keys = Object.keys(jObj);
  const len = keys.length;
  for (let i = 0; i < len; i++) {
    const key = keys[i];
    if (typeof jObj[key] === 'undefined') {
      // supress undefined node
    } else if (jObj[key] === null) {
      val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
    } else if (jObj[key] instanceof Date) {
      val += this.buildTextNode(jObj[key], key, '', level);
    } else if (typeof jObj[key] !== 'object') {
      //premitive type
      const attr = this.isAttribute(key);
      if (attr) {
        attrStr += ' ' + attr + '="' + this.options.attrValueProcessor('' + jObj[key]) + '"';
      } else if (this.isCDATA(key)) {
        if (jObj[this.options.textNodeName]) {
          val += this.replaceCDATAstr(jObj[this.options.textNodeName], jObj[key]);
        } else {
          val += this.replaceCDATAstr('', jObj[key]);
        }
      } else {
        //tag value
        if (key === this.options.textNodeName) {
          if (jObj[this.options.cdataTagName]) {
            //value will added while processing cdata
          } else {
            val += this.options.tagValueProcessor('' + jObj[key]);
          }
        } else {
          val += this.buildTextNode(jObj[key], key, '', level);
        }
      }
    } else if (Array.isArray(jObj[key])) {
      //repeated nodes
      if (this.isCDATA(key)) {
        val += this.indentate(level);
        if (jObj[this.options.textNodeName]) {
          val += this.replaceCDATAarr(jObj[this.options.textNodeName], jObj[key]);
        } else {
          val += this.replaceCDATAarr('', jObj[key]);
        }
      } else {
        //nested nodes
        const arrLen = jObj[key].length;
        for (let j = 0; j < arrLen; j++) {
          const item = jObj[key][j];
          if (typeof item === 'undefined') {
            // supress undefined node
          } else if (item === null) {
            val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
          } else if (typeof item === 'object') {
            const result = this.j2x(item, level + 1);
            val += this.buildObjNode(result.val, key, result.attrStr, level);
          } else {
            val += this.buildTextNode(item, key, '', level);
          }
        }
      }
    } else {
      //nested node
      if (this.options.attrNodeName && key === this.options.attrNodeName) {
        const Ks = Object.keys(jObj[key]);
        const L = Ks.length;
        for (let j = 0; j < L; j++) {
          attrStr += ' ' + Ks[j] + '="' + this.options.attrValueProcessor('' + jObj[key][Ks[j]]) + '"';
        }
      } else {
        const result = this.j2x(jObj[key], level + 1);
        val += this.buildObjNode(result.val, key, result.attrStr, level);
      }
    }
  }
  return {attrStr: attrStr, val: val};
};

function replaceCDATAstr(str, cdata) {
  str = this.options.tagValueProcessor('' + str);
  if (this.options.cdataPositionChar === '' || str === '') {
    return str + '<![CDATA[' + cdata + ']]' + this.tagEndChar;
  } else {
    return str.replace(this.options.cdataPositionChar, '<![CDATA[' + cdata + ']]' + this.tagEndChar);
  }
}

function replaceCDATAarr(str, cdata) {
  str = this.options.tagValueProcessor('' + str);
  if (this.options.cdataPositionChar === '' || str === '') {
    return str + '<![CDATA[' + cdata.join(']]><![CDATA[') + ']]' + this.tagEndChar;
  } else {
    for (let v in cdata) {
      str = str.replace(this.options.cdataPositionChar, '<![CDATA[' + cdata[v] + ']]>');
    }
    return str + this.newLine;
  }
}

function buildObjectNode(val, key, attrStr, level) {
  if (attrStr && !val.includes('<')) {
    return (
      this.indentate(level) +
      '<' +
      key +
      attrStr +
      '>' +
      val +
      //+ this.newLine
      // + this.indentate(level)
      '</' +
      key +
      this.tagEndChar
    );
  } else {
    return (
      this.indentate(level) +
      '<' +
      key +
      attrStr +
      this.tagEndChar +
      val +
      //+ this.newLine
      this.indentate(level) +
      '</' +
      key +
      this.tagEndChar
    );
  }
}

function buildEmptyObjNode(val, key, attrStr, level) {
  if (val !== '') {
    return this.buildObjectNode(val, key, attrStr, level);
  } else {
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
    //+ this.newLine
  }
}

function buildTextValNode(val, key, attrStr, level) {
  return (
    this.indentate(level) +
    '<' +
    key +
    attrStr +
    '>' +
    this.options.tagValueProcessor(val) +
    '</' +
    key +
    this.tagEndChar
  );
}

function buildEmptyTextNode(val, key, attrStr, level) {
  if (val !== '') {
    return this.buildTextValNode(val, key, attrStr, level);
  } else {
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
  }
}

function indentate(level) {
  return this.options.indentBy.repeat(level);
}

function isAttribute(name /*, options*/) {
  if (name.startsWith(this.options.attributeNamePrefix)) {
    return name.substr(this.attrPrefixLen);
  } else {
    return false;
  }
}

function isCDATA(name) {
  return name === this.options.cdataTagName;
}

//formatting
//indentation
//\n after each closing or self closing tag

module.exports = Parser;


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/nimndata.js":
/*!******************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/nimndata.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


const char = function(a) {
  return String.fromCharCode(a);
};

const chars = {
  nilChar: char(176),
  missingChar: char(201),
  nilPremitive: char(175),
  missingPremitive: char(200),

  emptyChar: char(178),
  emptyValue: char(177), //empty Premitive

  boundryChar: char(179),

  objStart: char(198),
  arrStart: char(204),
  arrayEnd: char(185),
};

const charsArr = [
  chars.nilChar,
  chars.nilPremitive,
  chars.missingChar,
  chars.missingPremitive,
  chars.boundryChar,
  chars.emptyChar,
  chars.emptyValue,
  chars.arrayEnd,
  chars.objStart,
  chars.arrStart,
];

const _e = function(node, e_schema, options) {
  if (typeof e_schema === 'string') {
    //premitive
    if (node && node[0] && node[0].val !== undefined) {
      return getValue(node[0].val, e_schema);
    } else {
      return getValue(node, e_schema);
    }
  } else {
    const hasValidData = hasData(node);
    if (hasValidData === true) {
      let str = '';
      if (Array.isArray(e_schema)) {
        //attributes can't be repeated. hence check in children tags only
        str += chars.arrStart;
        const itemSchema = e_schema[0];
        //var itemSchemaType = itemSchema;
        const arr_len = node.length;

        if (typeof itemSchema === 'string') {
          for (let arr_i = 0; arr_i < arr_len; arr_i++) {
            const r = getValue(node[arr_i].val, itemSchema);
            str = processValue(str, r);
          }
        } else {
          for (let arr_i = 0; arr_i < arr_len; arr_i++) {
            const r = _e(node[arr_i], itemSchema, options);
            str = processValue(str, r);
          }
        }
        str += chars.arrayEnd; //indicates that next item is not array item
      } else {
        //object
        str += chars.objStart;
        const keys = Object.keys(e_schema);
        if (Array.isArray(node)) {
          node = node[0];
        }
        for (let i in keys) {
          const key = keys[i];
          //a property defined in schema can be present either in attrsMap or children tags
          //options.textNodeName will not present in both maps, take it's value from val
          //options.attrNodeName will be present in attrsMap
          let r;
          if (!options.ignoreAttributes && node.attrsMap && node.attrsMap[key]) {
            r = _e(node.attrsMap[key], e_schema[key], options);
          } else if (key === options.textNodeName) {
            r = _e(node.val, e_schema[key], options);
          } else {
            r = _e(node.child[key], e_schema[key], options);
          }
          str = processValue(str, r);
        }
      }
      return str;
    } else {
      return hasValidData;
    }
  }
};

const getValue = function(a /*, type*/) {
  switch (a) {
    case undefined:
      return chars.missingPremitive;
    case null:
      return chars.nilPremitive;
    case '':
      return chars.emptyValue;
    default:
      return a;
  }
};

const processValue = function(str, r) {
  if (!isAppChar(r[0]) && !isAppChar(str[str.length - 1])) {
    str += chars.boundryChar;
  }
  return str + r;
};

const isAppChar = function(ch) {
  return charsArr.indexOf(ch) !== -1;
};

function hasData(jObj) {
  if (jObj === undefined) {
    return chars.missingChar;
  } else if (jObj === null) {
    return chars.nilChar;
  } else if (
    jObj.child &&
    Object.keys(jObj.child).length === 0 &&
    (!jObj.attrsMap || Object.keys(jObj.attrsMap).length === 0)
  ) {
    return chars.emptyChar;
  } else {
    return true;
  }
}

const x2j = __webpack_require__(/*! ./xmlstr2xmlnode */ "./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js");
const buildOptions = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js").buildOptions;

const convert2nimn = function(node, e_schema, options) {
  options = buildOptions(options, x2j.defaultOptions, x2j.props);
  return _e(node, e_schema, options);
};

exports.convert2nimn = convert2nimn;


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/node2json.js":
/*!*******************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/node2json.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const util = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js");

const convertToJson = function(node, options, parentTagName) {
  const jObj = {};

  // when no child node or attr is present
  if ((!node.child || util.isEmptyObject(node.child)) && (!node.attrsMap || util.isEmptyObject(node.attrsMap))) {
    return util.isExist(node.val) ? node.val : '';
  }

  // otherwise create a textnode if node has some text
  if (util.isExist(node.val) && !(typeof node.val === 'string' && (node.val === '' || node.val === options.cdataPositionChar))) {
    const asArray = util.isTagNameInArrayMode(node.tagname, options.arrayMode, parentTagName)
    jObj[options.textNodeName] = asArray ? [node.val] : node.val;
  }

  util.merge(jObj, node.attrsMap, options.arrayMode);

  const keys = Object.keys(node.child);
  for (let index = 0; index < keys.length; index++) {
    const tagName = keys[index];
    if (node.child[tagName] && node.child[tagName].length > 1) {
      jObj[tagName] = [];
      for (let tag in node.child[tagName]) {
        if (node.child[tagName].hasOwnProperty(tag)) {
          jObj[tagName].push(convertToJson(node.child[tagName][tag], options, tagName));
        }
      }
    } else {
      const result = convertToJson(node.child[tagName][0], options, tagName);
      const asArray = (options.arrayMode === true && typeof result === 'object') || util.isTagNameInArrayMode(tagName, options.arrayMode, parentTagName);
      jObj[tagName] = asArray ? [result] : result;
    }
  }

  //add value
  return jObj;
};

exports.convertToJson = convertToJson;


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/node2json_str.js":
/*!***********************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/node2json_str.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const util = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js");
const buildOptions = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js").buildOptions;
const x2j = __webpack_require__(/*! ./xmlstr2xmlnode */ "./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js");

//TODO: do it later
const convertToJsonString = function(node, options) {
  options = buildOptions(options, x2j.defaultOptions, x2j.props);

  options.indentBy = options.indentBy || '';
  return _cToJsonStr(node, options, 0);
};

const _cToJsonStr = function(node, options, level) {
  let jObj = '{';

  //traver through all the children
  const keys = Object.keys(node.child);

  for (let index = 0; index < keys.length; index++) {
    var tagname = keys[index];
    if (node.child[tagname] && node.child[tagname].length > 1) {
      jObj += '"' + tagname + '" : [ ';
      for (var tag in node.child[tagname]) {
        jObj += _cToJsonStr(node.child[tagname][tag], options) + ' , ';
      }
      jObj = jObj.substr(0, jObj.length - 1) + ' ] '; //remove extra comma in last
    } else {
      jObj += '"' + tagname + '" : ' + _cToJsonStr(node.child[tagname][0], options) + ' ,';
    }
  }
  util.merge(jObj, node.attrsMap);
  //add attrsMap as new children
  if (util.isEmptyObject(jObj)) {
    return util.isExist(node.val) ? node.val : '';
  } else {
    if (util.isExist(node.val)) {
      if (!(typeof node.val === 'string' && (node.val === '' || node.val === options.cdataPositionChar))) {
        jObj += '"' + options.textNodeName + '" : ' + stringval(node.val);
      }
    }
  }
  //add value
  if (jObj[jObj.length - 1] === ',') {
    jObj = jObj.substr(0, jObj.length - 2);
  }
  return jObj + '}';
};

function stringval(v) {
  if (v === true || v === false || !isNaN(v)) {
    return v;
  } else {
    return '"' + v + '"';
  }
}

function indentate(options, level) {
  return options.indentBy.repeat(level);
}

exports.convertToJsonString = convertToJsonString;


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/parser.js":
/*!****************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/parser.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const nodeToJson = __webpack_require__(/*! ./node2json */ "./node_modules/fast-xml-parser/src/node2json.js");
const xmlToNodeobj = __webpack_require__(/*! ./xmlstr2xmlnode */ "./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js");
const x2xmlnode = __webpack_require__(/*! ./xmlstr2xmlnode */ "./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js");
const buildOptions = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js").buildOptions;
const validator = __webpack_require__(/*! ./validator */ "./node_modules/fast-xml-parser/src/validator.js");

exports.parse = function(xmlData, options, validationOption) {
  if( validationOption){
    if(validationOption === true) validationOption = {}
    
    const result = validator.validate(xmlData, validationOption);
    if (result !== true) {
      throw Error( result.err.msg)
    }
  }
  options = buildOptions(options, x2xmlnode.defaultOptions, x2xmlnode.props);
  const traversableObj = xmlToNodeobj.getTraversalObj(xmlData, options)
  //print(traversableObj, "  ");
  return nodeToJson.convertToJson(traversableObj, options);
};
exports.convertTonimn = __webpack_require__(/*! ./nimndata */ "./node_modules/fast-xml-parser/src/nimndata.js").convert2nimn;
exports.getTraversalObj = xmlToNodeobj.getTraversalObj;
exports.convertToJson = nodeToJson.convertToJson;
exports.convertToJsonString = __webpack_require__(/*! ./node2json_str */ "./node_modules/fast-xml-parser/src/node2json_str.js").convertToJsonString;
exports.validate = validator.validate;
exports.j2xParser = __webpack_require__(/*! ./json2xml */ "./node_modules/fast-xml-parser/src/json2xml.js");
exports.parseToNimn = function(xmlData, schema, options) {
  return exports.convertTonimn(exports.getTraversalObj(xmlData, options), schema, options);
};


function print(xmlNode, indentation){
  if(xmlNode){
    console.log(indentation + "{")
    console.log(indentation + "  \"tagName\": \"" + xmlNode.tagname + "\", ");
    if(xmlNode.parent){
      console.log(indentation + "  \"parent\": \"" + xmlNode.parent.tagname  + "\", ");
    }
    console.log(indentation + "  \"val\": \"" + xmlNode.val  + "\", ");
    console.log(indentation + "  \"attrs\": " + JSON.stringify(xmlNode.attrsMap,null,4)  + ", ");

    if(xmlNode.child){
      console.log(indentation + "\"child\": {")
      const indentation2 = indentation + indentation;
      Object.keys(xmlNode.child).forEach( function(key) {
        const node = xmlNode.child[key];

        if(Array.isArray(node)){
          console.log(indentation +  "\""+key+"\" :[")
          node.forEach( function(item,index) {
            //console.log(indentation + " \""+index+"\" : [")
            print(item, indentation2);
          })
          console.log(indentation + "],")  
        }else{
          console.log(indentation + " \""+key+"\" : {")
          print(node, indentation2);
          console.log(indentation + "},")  
        }
      });
      console.log(indentation + "},")
    }
    console.log(indentation + "},")
  }
}


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/util.js":
/*!**************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/util.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports) => {



const nameStartChar = ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
const nameChar = nameStartChar + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040';
const nameRegexp = '[' + nameStartChar + '][' + nameChar + ']*'
const regexName = new RegExp('^' + nameRegexp + '$');

const getAllMatches = function(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
};

const isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === 'undefined');
};

exports.isExist = function(v) {
  return typeof v !== 'undefined';
};

exports.isEmptyObject = function(obj) {
  return Object.keys(obj).length === 0;
};

/**
 * Copy all the properties of a into b.
 * @param {*} target
 * @param {*} a
 */
exports.merge = function(target, a, arrayMode) {
  if (a) {
    const keys = Object.keys(a); // will return an array of own properties
    const len = keys.length; //don't make it inline
    for (let i = 0; i < len; i++) {
      if (arrayMode === 'strict') {
        target[keys[i]] = [ a[keys[i]] ];
      } else {
        target[keys[i]] = a[keys[i]];
      }
    }
  }
};
/* exports.merge =function (b,a){
  return Object.assign(b,a);
} */

exports.getValue = function(v) {
  if (exports.isExist(v)) {
    return v;
  } else {
    return '';
  }
};

// const fakeCall = function(a) {return a;};
// const fakeCallNoReturn = function() {};

exports.buildOptions = function(options, defaultOptions, props) {
  var newOptions = {};
  if (!options) {
    return defaultOptions; //if there are not options
  }

  for (let i = 0; i < props.length; i++) {
    if (options[props[i]] !== undefined) {
      newOptions[props[i]] = options[props[i]];
    } else {
      newOptions[props[i]] = defaultOptions[props[i]];
    }
  }
  return newOptions;
};

/**
 * Check if a tag name should be treated as array
 *
 * @param tagName the node tagname
 * @param arrayMode the array mode option
 * @param parentTagName the parent tag name
 * @returns {boolean} true if node should be parsed as array
 */
exports.isTagNameInArrayMode = function (tagName, arrayMode, parentTagName) {
  if (arrayMode === false) {
    return false;
  } else if (arrayMode instanceof RegExp) {
    return arrayMode.test(tagName);
  } else if (typeof arrayMode === 'function') {
    return !!arrayMode(tagName, parentTagName);
  }

  return arrayMode === "strict";
}

exports.isName = isName;
exports.getAllMatches = getAllMatches;
exports.nameRegexp = nameRegexp;


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/validator.js":
/*!*******************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/validator.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const util = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js");

const defaultOptions = {
  allowBooleanAttributes: false, //A tag can have attributes without any value
};

const props = ['allowBooleanAttributes'];

//const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");
exports.validate = function (xmlData, options) {
  options = util.buildOptions(options, defaultOptions, props);

  //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE
  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }

  for (let i = 0; i < xmlData.length; i++) {

    if (xmlData[i] === '<' && xmlData[i+1] === '?') {
      i+=2;
      i = readPI(xmlData,i);
      if (i.err) return i;
    }else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value

      i++;
      
      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        }
        //read tagname
        let tagName = '';
        for (; i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r'; i++
        ) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          //continue;
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "There is an unnecessary space between tag name and backward slash '</ ..'.";
          } else {
            msg = "Tag '"+tagName+"' is an invalid name.";
          }
          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '"+tagName+"' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
            //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, i));
          } else {
            const otg = tags.pop();
            if (tagName !== otg) {
              return getErrorObject('InvalidTag', "Closing tag '"+otg+"' is expected inplace of '"+tagName+"'.", getLineNumberForPosition(xmlData, i));
            }

            //when there are no more tags, we reached the root level.
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          //if the root level has been reached before ...
          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else {
            tags.push(tagName);
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i+1] === '?') {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else{
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if (xmlData[i] === ' ' || xmlData[i] === '\t' || xmlData[i] === '\n' || xmlData[i] === '\r') {
        continue;
      }
      return getErrorObject('InvalidChar', "char '"+xmlData[i]+"' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  } else if (tags.length > 0) {
    return getErrorObject('InvalidXml', "Invalid '"+JSON.stringify(tags, null, 4).replace(/\r?\n/g, '')+"' found.", 1);
  }

  return true;
};

/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */
function readPI(xmlData, i) {
  var start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == '?' || xmlData[i] == ' ') {
      //tagname
      var tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === 'xml') {
        return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == '?' && xmlData[i + 1] == '>') {
        //check if valid attribut string
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}

function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    //comment
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  } else if (
    xmlData.length > i + 8 &&
    xmlData[i + 1] === 'D' &&
    xmlData[i + 2] === 'O' &&
    xmlData[i + 3] === 'C' &&
    xmlData[i + 4] === 'T' &&
    xmlData[i + 5] === 'Y' &&
    xmlData[i + 6] === 'P' &&
    xmlData[i + 7] === 'E'
  ) {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === '<') {
        angleBracketsCount++;
      } else if (xmlData[i] === '>') {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (
    xmlData.length > i + 9 &&
    xmlData[i + 1] === '[' &&
    xmlData[i + 2] === 'C' &&
    xmlData[i + 3] === 'D' &&
    xmlData[i + 4] === 'A' &&
    xmlData[i + 5] === 'T' &&
    xmlData[i + 6] === 'A' &&
    xmlData[i + 7] === '['
  ) {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  }

  return i;
}

var doubleQuote = '"';
var singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  let attrStr = '';
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
        //if vaue is enclosed with double quote then single quotes are allowed inside the value and vice versa
        continue;
      } else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== '') {
    return false;
  }

  return {
    value: attrStr,
    index: i,
    tagClosed: tagClosed
  };
}

/**
 * Select all the attributes whether valid or invalid.
 */
const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

//attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");

  //if(attrStr.trim().length === 0) return true; //empty string

  const matches = util.getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' has no space in starting.", getPositionFromMatch(attrStr, matches[i][0]))
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '"+matches[i][2]+"' is not allowed.", getPositionFromMatch(attrStr, matches[i][0]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is an invalid name.", getPositionFromMatch(attrStr, matches[i][0]));
    }
    if (!attrNames.hasOwnProperty(attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is repeated.", getPositionFromMatch(attrStr, matches[i][0]));
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';')
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}

function validateAmpersand(xmlData, i) {
  // https://www.w3.org/TR/xml/#dt-charref
  i++;
  if (xmlData[i] === ';')
    return -1;
  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ';')
      break;
    return -1;
  }
  return i;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber,
    },
  };
}

function validateAttrName(attrName) {
  return util.isName(attrName);
}

// const startsWithXML = /^xml/i;

function validateTagName(tagname) {
  return util.isName(tagname) /* && !tagname.match(startsWithXML) */;
}

//this function returns the line number for the character at the given index
function getLineNumberForPosition(xmlData, index) {
  var lines = xmlData.substring(0, index).split(/\r?\n/);
  return lines.length;
}

//this function returns the position of the last character of match within attrStr
function getPositionFromMatch(attrStr, match) {
  return attrStr.indexOf(match) + match.length;
}


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/xmlNode.js":
/*!*****************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/xmlNode.js ***!
  \*****************************************************/
/***/ ((module) => {



module.exports = function(tagname, parent, val) {
  this.tagname = tagname;
  this.parent = parent;
  this.child = {}; //child tags
  this.attrsMap = {}; //attributes map
  this.val = val; //text only
  this.addChild = function(child) {
    if (Array.isArray(this.child[child.tagname])) {
      //already presents
      this.child[child.tagname].push(child);
    } else {
      this.child[child.tagname] = [child];
    }
  };
};


/***/ }),

/***/ "./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js":
/*!************************************************************!*\
  !*** ./node_modules/fast-xml-parser/src/xmlstr2xmlnode.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const util = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js");
const buildOptions = __webpack_require__(/*! ./util */ "./node_modules/fast-xml-parser/src/util.js").buildOptions;
const xmlNode = __webpack_require__(/*! ./xmlNode */ "./node_modules/fast-xml-parser/src/xmlNode.js");
const regx =
  '<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)'
  .replace(/NAME/g, util.nameRegexp);

//const tagsRegx = new RegExp("<(\\/?[\\w:\\-\._]+)([^>]*)>(\\s*"+cdataRegx+")*([^<]+)?","g");
//const tagsRegx = new RegExp("<(\\/?)((\\w*:)?([\\w:\\-\._]+))([^>]*)>([^<]*)("+cdataRegx+"([^<]*))*([^<]+)?","g");

//polyfill
if (!Number.parseInt && window.parseInt) {
  Number.parseInt = window.parseInt;
}
if (!Number.parseFloat && window.parseFloat) {
  Number.parseFloat = window.parseFloat;
}

const defaultOptions = {
  attributeNamePrefix: '@_',
  attrNodeName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  ignoreNameSpace: false,
  allowBooleanAttributes: false, //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseNodeValue: true,
  parseAttributeValue: false,
  arrayMode: false,
  trimValues: true, //Trim string values of tag and attributes
  cdataTagName: false,
  cdataPositionChar: '\\c',
  tagValueProcessor: function(a, tagName) {
    return a;
  },
  attrValueProcessor: function(a, attrName) {
    return a;
  },
  stopNodes: []
  //decodeStrict: false,
};

exports.defaultOptions = defaultOptions;

const props = [
  'attributeNamePrefix',
  'attrNodeName',
  'textNodeName',
  'ignoreAttributes',
  'ignoreNameSpace',
  'allowBooleanAttributes',
  'parseNodeValue',
  'parseAttributeValue',
  'arrayMode',
  'trimValues',
  'cdataTagName',
  'cdataPositionChar',
  'tagValueProcessor',
  'attrValueProcessor',
  'parseTrueNumberOnly',
  'stopNodes'
];
exports.props = props;

/**
 * Trim -> valueProcessor -> parse value
 * @param {string} tagName
 * @param {string} val
 * @param {object} options
 */
function processTagValue(tagName, val, options) {
  if (val) {
    if (options.trimValues) {
      val = val.trim();
    }
    val = options.tagValueProcessor(val, tagName);
    val = parseValue(val, options.parseNodeValue, options.parseTrueNumberOnly);
  }

  return val;
}

function resolveNameSpace(tagname, options) {
  if (options.ignoreNameSpace) {
    const tags = tagname.split(':');
    const prefix = tagname.charAt(0) === '/' ? '/' : '';
    if (tags[0] === 'xmlns') {
      return '';
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}

function parseValue(val, shouldParse, parseTrueNumberOnly) {
  if (shouldParse && typeof val === 'string') {
    let parsed;
    if (val.trim() === '' || isNaN(val)) {
      parsed = val === 'true' ? true : val === 'false' ? false : val;
    } else {
      if (val.indexOf('0x') !== -1) {
        //support hexa decimal
        parsed = Number.parseInt(val, 16);
      } else if (val.indexOf('.') !== -1) {
        parsed = Number.parseFloat(val);
        val = val.replace(/\.?0+$/, "");
      } else {
        parsed = Number.parseInt(val, 10);
      }
      if (parseTrueNumberOnly) {
        parsed = String(parsed) === val ? parsed : val;
      }
    }
    return parsed;
  } else {
    if (util.isExist(val)) {
      return val;
    } else {
      return '';
    }
  }
}

//TODO: change regex to capture NS
//const attrsRegx = new RegExp("([\\w\\-\\.\\:]+)\\s*=\\s*(['\"])((.|\n)*?)\\2","gm");
const attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])(.*?)\\3)?', 'g');

function buildAttributesMap(attrStr, options) {
  if (!options.ignoreAttributes && typeof attrStr === 'string') {
    attrStr = attrStr.replace(/\r?\n/g, ' ');
    //attrStr = attrStr || attrStr.trim();

    const matches = util.getAllMatches(attrStr, attrsRegx);
    const len = matches.length; //don't make it inline
    const attrs = {};
    for (let i = 0; i < len; i++) {
      const attrName = resolveNameSpace(matches[i][1], options);
      if (attrName.length) {
        if (matches[i][4] !== undefined) {
          if (options.trimValues) {
            matches[i][4] = matches[i][4].trim();
          }
          matches[i][4] = options.attrValueProcessor(matches[i][4], attrName);
          attrs[options.attributeNamePrefix + attrName] = parseValue(
            matches[i][4],
            options.parseAttributeValue,
            options.parseTrueNumberOnly
          );
        } else if (options.allowBooleanAttributes) {
          attrs[options.attributeNamePrefix + attrName] = true;
        }
      }
    }
    if (!Object.keys(attrs).length) {
      return;
    }
    if (options.attrNodeName) {
      const attrCollection = {};
      attrCollection[options.attrNodeName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}

const getTraversalObj = function(xmlData, options) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  options = buildOptions(options, defaultOptions, props);
  const xmlObj = new xmlNode('!xml');
  let currentNode = xmlObj;
  let textData = "";

//function match(xmlData){
  for(let i=0; i< xmlData.length; i++){
    const ch = xmlData[i];
    if(ch === '<'){
      if( xmlData[i+1] === '/') {//Closing Tag
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.")
        let tagName = xmlData.substring(i+2,closeIndex).trim();

        if(options.ignoreNameSpace){
          const colonIndex = tagName.indexOf(":");
          if(colonIndex !== -1){
            tagName = tagName.substr(colonIndex+1);
          }
        }

        /* if (currentNode.parent) {
          currentNode.parent.val = util.getValue(currentNode.parent.val) + '' + processTagValue2(tagName, textData , options);
        } */
        if(currentNode){
          if(currentNode.val){
            currentNode.val = util.getValue(currentNode.val) + '' + processTagValue(tagName, textData , options);
          }else{
            currentNode.val = processTagValue(tagName, textData , options);
          }
        }

        if (options.stopNodes.length && options.stopNodes.includes(currentNode.tagname)) {
          currentNode.child = []
          if (currentNode.attrsMap == undefined) { currentNode.attrsMap = {}}
          currentNode.val = xmlData.substr(currentNode.startIndex + 1, i - currentNode.startIndex - 1)
        }
        currentNode = currentNode.parent;
        textData = "";
        i = closeIndex;
      } else if( xmlData[i+1] === '?') {
        i = findClosingIndex(xmlData, "?>", i, "Pi Tag is not closed.")
      } else if(xmlData.substr(i + 1, 3) === '!--') {
        i = findClosingIndex(xmlData, "-->", i, "Comment is not closed.")
      } else if( xmlData.substr(i + 1, 2) === '!D') {
        const closeIndex = findClosingIndex(xmlData, ">", i, "DOCTYPE is not closed.")
        const tagExp = xmlData.substring(i, closeIndex);
        if(tagExp.indexOf("[") >= 0){
          i = xmlData.indexOf("]>", i) + 1;
        }else{
          i = closeIndex;
        }
      }else if(xmlData.substr(i + 1, 2) === '![') {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2
        const tagExp = xmlData.substring(i + 9,closeIndex);

        //considerations
        //1. CDATA will always have parent node
        //2. A tag with CDATA is not a leaf node so it's value would be string type.
        if(textData){
          currentNode.val = util.getValue(currentNode.val) + '' + processTagValue(currentNode.tagname, textData , options);
          textData = "";
        }

        if (options.cdataTagName) {
          //add cdata node
          const childNode = new xmlNode(options.cdataTagName, currentNode, tagExp);
          currentNode.addChild(childNode);
          //for backtracking
          currentNode.val = util.getValue(currentNode.val) + options.cdataPositionChar;
          //add rest value to parent node
          if (tagExp) {
            childNode.val = tagExp;
          }
        } else {
          currentNode.val = (currentNode.val || '') + (tagExp || '');
        }

        i = closeIndex + 2;
      }else {//Opening tag
        const result = closingIndexForOpeningTag(xmlData, i+1)
        let tagExp = result.data;
        const closeIndex = result.index;
        const separatorIndex = tagExp.indexOf(" ");
        let tagName = tagExp;
        let shouldBuildAttributesMap = true;
        if(separatorIndex !== -1){
          tagName = tagExp.substr(0, separatorIndex).replace(/\s\s*$/, '');
          tagExp = tagExp.substr(separatorIndex + 1);
        }

        if(options.ignoreNameSpace){
          const colonIndex = tagName.indexOf(":");
          if(colonIndex !== -1){
            tagName = tagName.substr(colonIndex+1);
            shouldBuildAttributesMap = tagName !== result.data.substr(colonIndex + 1);
          }
        }

        //save text to parent node
        if (currentNode && textData) {
          if(currentNode.tagname !== '!xml'){
            currentNode.val = util.getValue(currentNode.val) + '' + processTagValue( currentNode.tagname, textData, options);
          }
        }

        if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){//selfClosing tag

          if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          }else{
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }

          const childNode = new xmlNode(tagName, currentNode, '');
          if(tagName !== tagExp){
            childNode.attrsMap = buildAttributesMap(tagExp, options);
          }
          currentNode.addChild(childNode);
        }else{//opening tag

          const childNode = new xmlNode( tagName, currentNode );
          if (options.stopNodes.length && options.stopNodes.includes(childNode.tagname)) {
            childNode.startIndex=closeIndex;
          }
          if(tagName !== tagExp && shouldBuildAttributesMap){
            childNode.attrsMap = buildAttributesMap(tagExp, options);
          }
          currentNode.addChild(childNode);
          currentNode = childNode;
        }
        textData = "";
        i = closeIndex;
      }
    }else{
      textData += xmlData[i];
    }
  }
  return xmlObj;
}

function closingIndexForOpeningTag(data, i){
  let attrBoundary;
  let tagExp = "";
  for (let index = i; index < data.length; index++) {
    let ch = data[index];
    if (attrBoundary) {
        if (ch === attrBoundary) attrBoundary = "";//reset
    } else if (ch === '"' || ch === "'") {
        attrBoundary = ch;
    } else if (ch === '>') {
        return {
          data: tagExp,
          index: index
        }
    } else if (ch === '\t') {
      ch = " "
    }
    tagExp += ch;
  }
}

function findClosingIndex(xmlData, str, i, errMsg){
  const closingIndex = xmlData.indexOf(str, i);
  if(closingIndex === -1){
    throw new Error(errMsg)
  }else{
    return closingIndex + str.length - 1;
  }
}

exports.getTraversalObj = getTraversalObj;


/***/ }),

/***/ "./src/converter.ts":
/*!**************************!*\
  !*** ./src/converter.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Converter = void 0;
class Converter {
    convertKV6ToJson(data) {
        const busses = data.VV_TM_PUSH.KV6posinfo;
        return busses;
    }
}
exports.Converter = Converter;


/***/ }),

/***/ "./src/database.ts":
/*!*************************!*\
  !*** ./src/database.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Database = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const VehicleData_1 = __webpack_require__(/*! ./types/VehicleData */ "./src/types/VehicleData.ts");
class Database {
    static getInstance() {
        if (!Database.instance)
            Database.instance = new Database();
        return Database.instance;
    }
    async Init() {
        const url = process.env.DATABASE_URL;
        const name = process.env.DATABASE_NAME;
        this.mongoose = new mongoose_1.Mongoose();
        this.mongoose.set('useFindAndModify', false);
        if (!url && !name)
            throw (`Invalid URL or name given, received: \n Name: ${name} \n URL: ${url}`);
        console.log(`Connecting to database with name: ${name} at url: ${url}`);
        this.mongoose.connect(`${url}/${name}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        this.db = this.mongoose.connection;
        this.db.on('error', error => {
            throw new error(`Error connecting to database. ${error}`);
        });
        await this.DatabaseListener();
        return this;
    }
    async DatabaseListener() {
        return new Promise((res, rej) => {
            this.db.once("open", () => {
                console.log("Connection to database established.");
                this.vehicleSchema = new this.mongoose.Schema({
                    company: String,
                    planningNumber: String,
                    journeyNumber: Number,
                    timestamp: Number,
                    vehicleNumber: Number,
                    position: [Number, Number],
                    status: String,
                    createdAt: Number,
                    updatedAt: Number
                });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                res();
            });
        });
    }
    async GetAllVehicles(args = {}) {
        return await this.vehicleModel.find(args);
    }
    async GetVehicle(vehicleNumber, transporter, firstOnly = false) {
        return {
            ...await this.vehicleModel.findOne({
                vehicleNumber: vehicleNumber,
                company: transporter
            })
        };
    }
    async VehicleExists(vehicleNumber, transporter) {
        return await this.GetVehicle(vehicleNumber, transporter) !== null;
    }
    async UpdateVehicle(vehicleToUpdate, updatedVehicleData, positionChecks = false) {
        if (!vehicleToUpdate["_doc"])
            return;
        vehicleToUpdate = vehicleToUpdate["_doc"];
        if (positionChecks && updatedVehicleData.status !== VehicleData_1.vehicleState.ONROUTE)
            updatedVehicleData.position = vehicleToUpdate.position;
        updatedVehicleData.updatedAt = Date.now();
        await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
    }
    async AddVehicle(vehicle) {
        new this.vehicleModel({
            ...vehicle
        }).save(error => {
            if (error)
                console.error(`Something went wrong while trying to add vehicle: ${vehicle.vehicleNumber}. Error: ${error}`);
        });
    }
    async RemoveVehicle(vehicle) {
        if (!vehicle["_doc"])
            return;
        this.vehicleModel.findOneAndDelete(vehicle);
    }
}
exports.Database = Database;


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ (function(module, exports, __webpack_require__) {


/* --------------------
      APP CONFIG
----------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const dotenv = __importStar(__webpack_require__(/*! dotenv */ "dotenv"));
dotenv.config();
const port = process.env.PORT || 3001;
/* --------------------
      YARN IMPORTS
----------------------*/
const https = __importStar(__webpack_require__(/*! https */ "https"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const express = __webpack_require__(/*! express */ "express");
/* --------------------
    CUSTOM IMPORTS
----------------------*/
const database_1 = __webpack_require__(/*! ./database */ "./src/database.ts");
const socket_1 = __webpack_require__(/*! ./socket */ "./src/socket.ts");
const realtime_1 = __webpack_require__(/*! ./realtime */ "./src/realtime.ts");
/* --------------------
      SSL CONFIG
----------------------*/
const privateKey = fs.readFileSync("./certificate/key.key").toString();
const certificate = fs.readFileSync("./certificate/cert.crt").toString();
const ca = fs.readFileSync("./certificate/key-ca.crt").toString();
const AppInit = async () => {
    const db = await database_1.Database.getInstance().Init();
    const ov = realtime_1.OVData.getInstance();
    const app = (module.exports = express());
    const server = https.createServer({
        key: privateKey,
        cert: certificate,
        ca: ca,
        requestCert: true,
        rejectUnauthorized: false,
    }, app);
    new socket_1.Websocket(server);
    app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));
    app.get("/busses", async (req, res) => res.send(await db.GetAllVehicles()));
    app.get("/busses/:company/:number/", (req, res) => {
        res.send(JSON.stringify(req.params));
    });
    server.listen(port, () => console.log(`Listening at http://localhost:${port}`));
};
AppInit();


/***/ }),

/***/ "./src/realtime.ts":
/*!*************************!*\
  !*** ./src/realtime.ts ***!
  \*************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OVData = void 0;
const zlib_1 = __webpack_require__(/*! zlib */ "zlib");
const converter_1 = __webpack_require__(/*! ./converter */ "./src/converter.ts");
const xml = __importStar(__webpack_require__(/*! fast-xml-parser */ "./node_modules/fast-xml-parser/src/parser.js"));
const zmq = __webpack_require__(/*! zeromq */ "zeromq");
class OVData {
    constructor() {
        this.Init();
    }
    static getInstance() {
        if (!OVData.instance)
            OVData.instance = new OVData();
        return OVData.instance;
    }
    Init() {
        const converter = new converter_1.Converter();
        this.sock = zmq.socket("sub");
        this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
        this.sock.subscribe("/ARR/KV6posinfo");
        this.sock.on("message", (opCode, ...content) => {
            console.log(opCode.toString());
            const contents = Buffer.concat(content);
            zlib_1.gunzip(contents, (error, buffer) => {
                if (error)
                    return console.error(`Something went wrong while trying to unzip. ${error}`);
                const encodedXML = buffer.toString();
                const decoded = xml.parse(encodedXML);
                console.log(converter.convertKV6ToJson(decoded));
            });
        });
    }
    convertToVehicleData(json) {
        return null;
    }
}
exports.OVData = OVData;


/***/ }),

/***/ "./src/socket.ts":
/*!***********************!*\
  !*** ./src/socket.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Websocket = void 0;
class Websocket {
    constructor(server) {
        this.SocketInit(server);
    }
    SocketInit(server) {
        console.log(`Initalizing websocket`);
        this.io = __webpack_require__(/*! socket.io */ "socket.io")(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        this.io.on("connection", socket => {
            this.Socket(socket);
        });
    }
    Socket(socket) {
        console.log("New client connected.");
        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    }
}
exports.Websocket = Websocket;


/***/ }),

/***/ "./src/types/VehicleData.ts":
/*!**********************************!*\
  !*** ./src/types/VehicleData.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.vehicleState = void 0;
var vehicleState;
(function (vehicleState) {
    vehicleState["ONROUTE"] = "ONROUTE";
    vehicleState["ENDED"] = "ENDED";
    vehicleState["DEPARTURE"] = "DEPARTURE";
})(vehicleState = exports.vehicleState || (exports.vehicleState = {}));


/***/ }),

/***/ "dotenv":
/*!*************************!*\
  !*** external "dotenv" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("dotenv");;

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");;

/***/ }),

/***/ "mongoose":
/*!***************************!*\
  !*** external "mongoose" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("mongoose");;

/***/ }),

/***/ "socket.io":
/*!****************************!*\
  !*** external "socket.io" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("socket.io");;

/***/ }),

/***/ "zeromq":
/*!*************************!*\
  !*** external "zeromq" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("zeromq");;

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy9qc29uMnhtbC5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy9uaW1uZGF0YS5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy9ub2RlMmpzb24uanMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vbm9kZV9tb2R1bGVzL2Zhc3QteG1sLXBhcnNlci9zcmMvbm9kZTJqc29uX3N0ci5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy9wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vbm9kZV9tb2R1bGVzL2Zhc3QteG1sLXBhcnNlci9zcmMvdXRpbC5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy92YWxpZGF0b3IuanMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vbm9kZV9tb2R1bGVzL2Zhc3QteG1sLXBhcnNlci9zcmMveG1sTm9kZS5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9ub2RlX21vZHVsZXMvZmFzdC14bWwtcGFyc2VyL3NyYy94bWxzdHIyeG1sbm9kZS5qcyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvY29udmVydGVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9kYXRhYmFzZS50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvcmVhbHRpbWUudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3NvY2tldC50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvdHlwZXMvVmVoaWNsZURhdGEudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZXhwcmVzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiaHR0cHNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInNvY2tldC5pb1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInplcm9tcVwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInpsaWJcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svc3RhcnR1cCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQWE7QUFDYjtBQUNBLHFCQUFxQiw0RkFBOEI7O0FBRW5EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUIsU0FBUztBQUMxQjtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxLQUFLO0FBQ0w7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0EsdUJBQXVCLFlBQVk7QUFDbkM7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsT0FBTztBQUM5QjtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7Ozs7O0FDM1FhO0FBQ2I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDZCQUE2QixpQkFBaUI7QUFDOUM7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULDZCQUE2QixpQkFBaUI7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEI7QUFDOUIsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7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QzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0ZBQXdGLE1BQU07QUFDOUY7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYzs7Ozs7Ozs7Ozs7QUN4REQ7QUFDYiw4Q0FBNkMsQ0FBQyxjQUFjLEVBQUM7QUFDN0QsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixtQkFBTyxDQUFDLDRCQUFXO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxpQkFBaUI7Ozs7Ozs7Ozs7O0FDMUJKO0FBQ2IsOENBQTZDLENBQUMsY0FBYyxFQUFDO0FBQzdELG9CQUFvQjtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQywwQ0FBMEMsb0JBQW9CLEtBQUs7Ozs7Ozs7Ozs7O0FDUnBFLG9DOzs7Ozs7Ozs7O0FDQUEscUM7Ozs7Ozs7Ozs7QUNBQSxnQzs7Ozs7Ozs7OztBQ0FBLG1DOzs7Ozs7Ozs7O0FDQUEsc0M7Ozs7Ozs7Ozs7QUNBQSx1Qzs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuLy9wYXJzZSBFbXB0eSBOb2RlIGFzIHNlbGYgY2xvc2luZyBub2RlXG5jb25zdCBidWlsZE9wdGlvbnMgPSByZXF1aXJlKCcuL3V0aWwnKS5idWlsZE9wdGlvbnM7XG5cbmNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICBhdHRyaWJ1dGVOYW1lUHJlZml4OiAnQF8nLFxuICBhdHRyTm9kZU5hbWU6IGZhbHNlLFxuICB0ZXh0Tm9kZU5hbWU6ICcjdGV4dCcsXG4gIGlnbm9yZUF0dHJpYnV0ZXM6IHRydWUsXG4gIGNkYXRhVGFnTmFtZTogZmFsc2UsXG4gIGNkYXRhUG9zaXRpb25DaGFyOiAnXFxcXGMnLFxuICBmb3JtYXQ6IGZhbHNlLFxuICBpbmRlbnRCeTogJyAgJyxcbiAgc3VwcmVzc0VtcHR5Tm9kZTogZmFsc2UsXG4gIHRhZ1ZhbHVlUHJvY2Vzc29yOiBmdW5jdGlvbihhKSB7XG4gICAgcmV0dXJuIGE7XG4gIH0sXG4gIGF0dHJWYWx1ZVByb2Nlc3NvcjogZnVuY3Rpb24oYSkge1xuICAgIHJldHVybiBhO1xuICB9LFxufTtcblxuY29uc3QgcHJvcHMgPSBbXG4gICdhdHRyaWJ1dGVOYW1lUHJlZml4JyxcbiAgJ2F0dHJOb2RlTmFtZScsXG4gICd0ZXh0Tm9kZU5hbWUnLFxuICAnaWdub3JlQXR0cmlidXRlcycsXG4gICdjZGF0YVRhZ05hbWUnLFxuICAnY2RhdGFQb3NpdGlvbkNoYXInLFxuICAnZm9ybWF0JyxcbiAgJ2luZGVudEJ5JyxcbiAgJ3N1cHJlc3NFbXB0eU5vZGUnLFxuICAndGFnVmFsdWVQcm9jZXNzb3InLFxuICAnYXR0clZhbHVlUHJvY2Vzc29yJyxcbl07XG5cbmZ1bmN0aW9uIFBhcnNlcihvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IGJ1aWxkT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0T3B0aW9ucywgcHJvcHMpO1xuICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZUF0dHJpYnV0ZXMgfHwgdGhpcy5vcHRpb25zLmF0dHJOb2RlTmFtZSkge1xuICAgIHRoaXMuaXNBdHRyaWJ1dGUgPSBmdW5jdGlvbigvKmEqLykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hdHRyUHJlZml4TGVuID0gdGhpcy5vcHRpb25zLmF0dHJpYnV0ZU5hbWVQcmVmaXgubGVuZ3RoO1xuICAgIHRoaXMuaXNBdHRyaWJ1dGUgPSBpc0F0dHJpYnV0ZTtcbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLmNkYXRhVGFnTmFtZSkge1xuICAgIHRoaXMuaXNDREFUQSA9IGlzQ0RBVEE7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5pc0NEQVRBID0gZnVuY3Rpb24oLyphKi8pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICB9XG4gIHRoaXMucmVwbGFjZUNEQVRBc3RyID0gcmVwbGFjZUNEQVRBc3RyO1xuICB0aGlzLnJlcGxhY2VDREFUQWFyciA9IHJlcGxhY2VDREFUQWFycjtcblxuICBpZiAodGhpcy5vcHRpb25zLmZvcm1hdCkge1xuICAgIHRoaXMuaW5kZW50YXRlID0gaW5kZW50YXRlO1xuICAgIHRoaXMudGFnRW5kQ2hhciA9ICc+XFxuJztcbiAgICB0aGlzLm5ld0xpbmUgPSAnXFxuJztcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmluZGVudGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH07XG4gICAgdGhpcy50YWdFbmRDaGFyID0gJz4nO1xuICAgIHRoaXMubmV3TGluZSA9ICcnO1xuICB9XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5zdXByZXNzRW1wdHlOb2RlKSB7XG4gICAgdGhpcy5idWlsZFRleHROb2RlID0gYnVpbGRFbXB0eVRleHROb2RlO1xuICAgIHRoaXMuYnVpbGRPYmpOb2RlID0gYnVpbGRFbXB0eU9iak5vZGU7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5idWlsZFRleHROb2RlID0gYnVpbGRUZXh0VmFsTm9kZTtcbiAgICB0aGlzLmJ1aWxkT2JqTm9kZSA9IGJ1aWxkT2JqZWN0Tm9kZTtcbiAgfVxuXG4gIHRoaXMuYnVpbGRUZXh0VmFsTm9kZSA9IGJ1aWxkVGV4dFZhbE5vZGU7XG4gIHRoaXMuYnVpbGRPYmplY3ROb2RlID0gYnVpbGRPYmplY3ROb2RlO1xufVxuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oak9iaikge1xuICByZXR1cm4gdGhpcy5qMngoak9iaiwgMCkudmFsO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5qMnggPSBmdW5jdGlvbihqT2JqLCBsZXZlbCkge1xuICBsZXQgYXR0clN0ciA9ICcnO1xuICBsZXQgdmFsID0gJyc7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhqT2JqKTtcbiAgY29uc3QgbGVuID0ga2V5cy5sZW5ndGg7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICh0eXBlb2Ygak9ialtrZXldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gc3VwcmVzcyB1bmRlZmluZWQgbm9kZVxuICAgIH0gZWxzZSBpZiAoak9ialtrZXldID09PSBudWxsKSB7XG4gICAgICB2YWwgKz0gdGhpcy5pbmRlbnRhdGUobGV2ZWwpICsgJzwnICsga2V5ICsgJy8nICsgdGhpcy50YWdFbmRDaGFyO1xuICAgIH0gZWxzZSBpZiAoak9ialtrZXldIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgdmFsICs9IHRoaXMuYnVpbGRUZXh0Tm9kZShqT2JqW2tleV0sIGtleSwgJycsIGxldmVsKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBqT2JqW2tleV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAvL3ByZW1pdGl2ZSB0eXBlXG4gICAgICBjb25zdCBhdHRyID0gdGhpcy5pc0F0dHJpYnV0ZShrZXkpO1xuICAgICAgaWYgKGF0dHIpIHtcbiAgICAgICAgYXR0clN0ciArPSAnICcgKyBhdHRyICsgJz1cIicgKyB0aGlzLm9wdGlvbnMuYXR0clZhbHVlUHJvY2Vzc29yKCcnICsgak9ialtrZXldKSArICdcIic7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNDREFUQShrZXkpKSB7XG4gICAgICAgIGlmIChqT2JqW3RoaXMub3B0aW9ucy50ZXh0Tm9kZU5hbWVdKSB7XG4gICAgICAgICAgdmFsICs9IHRoaXMucmVwbGFjZUNEQVRBc3RyKGpPYmpbdGhpcy5vcHRpb25zLnRleHROb2RlTmFtZV0sIGpPYmpba2V5XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsICs9IHRoaXMucmVwbGFjZUNEQVRBc3RyKCcnLCBqT2JqW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL3RhZyB2YWx1ZVxuICAgICAgICBpZiAoa2V5ID09PSB0aGlzLm9wdGlvbnMudGV4dE5vZGVOYW1lKSB7XG4gICAgICAgICAgaWYgKGpPYmpbdGhpcy5vcHRpb25zLmNkYXRhVGFnTmFtZV0pIHtcbiAgICAgICAgICAgIC8vdmFsdWUgd2lsbCBhZGRlZCB3aGlsZSBwcm9jZXNzaW5nIGNkYXRhXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbCArPSB0aGlzLm9wdGlvbnMudGFnVmFsdWVQcm9jZXNzb3IoJycgKyBqT2JqW2tleV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWwgKz0gdGhpcy5idWlsZFRleHROb2RlKGpPYmpba2V5XSwga2V5LCAnJywgbGV2ZWwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGpPYmpba2V5XSkpIHtcbiAgICAgIC8vcmVwZWF0ZWQgbm9kZXNcbiAgICAgIGlmICh0aGlzLmlzQ0RBVEEoa2V5KSkge1xuICAgICAgICB2YWwgKz0gdGhpcy5pbmRlbnRhdGUobGV2ZWwpO1xuICAgICAgICBpZiAoak9ialt0aGlzLm9wdGlvbnMudGV4dE5vZGVOYW1lXSkge1xuICAgICAgICAgIHZhbCArPSB0aGlzLnJlcGxhY2VDREFUQWFycihqT2JqW3RoaXMub3B0aW9ucy50ZXh0Tm9kZU5hbWVdLCBqT2JqW2tleV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbCArPSB0aGlzLnJlcGxhY2VDREFUQWFycignJywgak9ialtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9uZXN0ZWQgbm9kZXNcbiAgICAgICAgY29uc3QgYXJyTGVuID0gak9ialtrZXldLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhcnJMZW47IGorKykge1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBqT2JqW2tleV1bal07XG4gICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gc3VwcmVzcyB1bmRlZmluZWQgbm9kZVxuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsICs9IHRoaXMuaW5kZW50YXRlKGxldmVsKSArICc8JyArIGtleSArICcvJyArIHRoaXMudGFnRW5kQ2hhcjtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5qMngoaXRlbSwgbGV2ZWwgKyAxKTtcbiAgICAgICAgICAgIHZhbCArPSB0aGlzLmJ1aWxkT2JqTm9kZShyZXN1bHQudmFsLCBrZXksIHJlc3VsdC5hdHRyU3RyLCBsZXZlbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbCArPSB0aGlzLmJ1aWxkVGV4dE5vZGUoaXRlbSwga2V5LCAnJywgbGV2ZWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvL25lc3RlZCBub2RlXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmF0dHJOb2RlTmFtZSAmJiBrZXkgPT09IHRoaXMub3B0aW9ucy5hdHRyTm9kZU5hbWUpIHtcbiAgICAgICAgY29uc3QgS3MgPSBPYmplY3Qua2V5cyhqT2JqW2tleV0pO1xuICAgICAgICBjb25zdCBMID0gS3MubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEw7IGorKykge1xuICAgICAgICAgIGF0dHJTdHIgKz0gJyAnICsgS3Nbal0gKyAnPVwiJyArIHRoaXMub3B0aW9ucy5hdHRyVmFsdWVQcm9jZXNzb3IoJycgKyBqT2JqW2tleV1bS3Nbal1dKSArICdcIic7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuajJ4KGpPYmpba2V5XSwgbGV2ZWwgKyAxKTtcbiAgICAgICAgdmFsICs9IHRoaXMuYnVpbGRPYmpOb2RlKHJlc3VsdC52YWwsIGtleSwgcmVzdWx0LmF0dHJTdHIsIGxldmVsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHthdHRyU3RyOiBhdHRyU3RyLCB2YWw6IHZhbH07XG59O1xuXG5mdW5jdGlvbiByZXBsYWNlQ0RBVEFzdHIoc3RyLCBjZGF0YSkge1xuICBzdHIgPSB0aGlzLm9wdGlvbnMudGFnVmFsdWVQcm9jZXNzb3IoJycgKyBzdHIpO1xuICBpZiAodGhpcy5vcHRpb25zLmNkYXRhUG9zaXRpb25DaGFyID09PSAnJyB8fCBzdHIgPT09ICcnKSB7XG4gICAgcmV0dXJuIHN0ciArICc8IVtDREFUQVsnICsgY2RhdGEgKyAnXV0nICsgdGhpcy50YWdFbmRDaGFyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSh0aGlzLm9wdGlvbnMuY2RhdGFQb3NpdGlvbkNoYXIsICc8IVtDREFUQVsnICsgY2RhdGEgKyAnXV0nICsgdGhpcy50YWdFbmRDaGFyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXBsYWNlQ0RBVEFhcnIoc3RyLCBjZGF0YSkge1xuICBzdHIgPSB0aGlzLm9wdGlvbnMudGFnVmFsdWVQcm9jZXNzb3IoJycgKyBzdHIpO1xuICBpZiAodGhpcy5vcHRpb25zLmNkYXRhUG9zaXRpb25DaGFyID09PSAnJyB8fCBzdHIgPT09ICcnKSB7XG4gICAgcmV0dXJuIHN0ciArICc8IVtDREFUQVsnICsgY2RhdGEuam9pbignXV0+PCFbQ0RBVEFbJykgKyAnXV0nICsgdGhpcy50YWdFbmRDaGFyO1xuICB9IGVsc2Uge1xuICAgIGZvciAobGV0IHYgaW4gY2RhdGEpIHtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKHRoaXMub3B0aW9ucy5jZGF0YVBvc2l0aW9uQ2hhciwgJzwhW0NEQVRBWycgKyBjZGF0YVt2XSArICddXT4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0ciArIHRoaXMubmV3TGluZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZE9iamVjdE5vZGUodmFsLCBrZXksIGF0dHJTdHIsIGxldmVsKSB7XG4gIGlmIChhdHRyU3RyICYmICF2YWwuaW5jbHVkZXMoJzwnKSkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLmluZGVudGF0ZShsZXZlbCkgK1xuICAgICAgJzwnICtcbiAgICAgIGtleSArXG4gICAgICBhdHRyU3RyICtcbiAgICAgICc+JyArXG4gICAgICB2YWwgK1xuICAgICAgLy8rIHRoaXMubmV3TGluZVxuICAgICAgLy8gKyB0aGlzLmluZGVudGF0ZShsZXZlbClcbiAgICAgICc8LycgK1xuICAgICAga2V5ICtcbiAgICAgIHRoaXMudGFnRW5kQ2hhclxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuaW5kZW50YXRlKGxldmVsKSArXG4gICAgICAnPCcgK1xuICAgICAga2V5ICtcbiAgICAgIGF0dHJTdHIgK1xuICAgICAgdGhpcy50YWdFbmRDaGFyICtcbiAgICAgIHZhbCArXG4gICAgICAvLysgdGhpcy5uZXdMaW5lXG4gICAgICB0aGlzLmluZGVudGF0ZShsZXZlbCkgK1xuICAgICAgJzwvJyArXG4gICAgICBrZXkgK1xuICAgICAgdGhpcy50YWdFbmRDaGFyXG4gICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZEVtcHR5T2JqTm9kZSh2YWwsIGtleSwgYXR0clN0ciwgbGV2ZWwpIHtcbiAgaWYgKHZhbCAhPT0gJycpIHtcbiAgICByZXR1cm4gdGhpcy5idWlsZE9iamVjdE5vZGUodmFsLCBrZXksIGF0dHJTdHIsIGxldmVsKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5pbmRlbnRhdGUobGV2ZWwpICsgJzwnICsga2V5ICsgYXR0clN0ciArICcvJyArIHRoaXMudGFnRW5kQ2hhcjtcbiAgICAvLysgdGhpcy5uZXdMaW5lXG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRUZXh0VmFsTm9kZSh2YWwsIGtleSwgYXR0clN0ciwgbGV2ZWwpIHtcbiAgcmV0dXJuIChcbiAgICB0aGlzLmluZGVudGF0ZShsZXZlbCkgK1xuICAgICc8JyArXG4gICAga2V5ICtcbiAgICBhdHRyU3RyICtcbiAgICAnPicgK1xuICAgIHRoaXMub3B0aW9ucy50YWdWYWx1ZVByb2Nlc3Nvcih2YWwpICtcbiAgICAnPC8nICtcbiAgICBrZXkgK1xuICAgIHRoaXMudGFnRW5kQ2hhclxuICApO1xufVxuXG5mdW5jdGlvbiBidWlsZEVtcHR5VGV4dE5vZGUodmFsLCBrZXksIGF0dHJTdHIsIGxldmVsKSB7XG4gIGlmICh2YWwgIT09ICcnKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVpbGRUZXh0VmFsTm9kZSh2YWwsIGtleSwgYXR0clN0ciwgbGV2ZWwpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmluZGVudGF0ZShsZXZlbCkgKyAnPCcgKyBrZXkgKyBhdHRyU3RyICsgJy8nICsgdGhpcy50YWdFbmRDaGFyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGVudGF0ZShsZXZlbCkge1xuICByZXR1cm4gdGhpcy5vcHRpb25zLmluZGVudEJ5LnJlcGVhdChsZXZlbCk7XG59XG5cbmZ1bmN0aW9uIGlzQXR0cmlidXRlKG5hbWUgLyosIG9wdGlvbnMqLykge1xuICBpZiAobmFtZS5zdGFydHNXaXRoKHRoaXMub3B0aW9ucy5hdHRyaWJ1dGVOYW1lUHJlZml4KSkge1xuICAgIHJldHVybiBuYW1lLnN1YnN0cih0aGlzLmF0dHJQcmVmaXhMZW4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0NEQVRBKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgPT09IHRoaXMub3B0aW9ucy5jZGF0YVRhZ05hbWU7XG59XG5cbi8vZm9ybWF0dGluZ1xuLy9pbmRlbnRhdGlvblxuLy9cXG4gYWZ0ZXIgZWFjaCBjbG9zaW5nIG9yIHNlbGYgY2xvc2luZyB0YWdcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5jb25zdCBjaGFyID0gZnVuY3Rpb24oYSkge1xuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShhKTtcbn07XG5cbmNvbnN0IGNoYXJzID0ge1xuICBuaWxDaGFyOiBjaGFyKDE3NiksXG4gIG1pc3NpbmdDaGFyOiBjaGFyKDIwMSksXG4gIG5pbFByZW1pdGl2ZTogY2hhcigxNzUpLFxuICBtaXNzaW5nUHJlbWl0aXZlOiBjaGFyKDIwMCksXG5cbiAgZW1wdHlDaGFyOiBjaGFyKDE3OCksXG4gIGVtcHR5VmFsdWU6IGNoYXIoMTc3KSwgLy9lbXB0eSBQcmVtaXRpdmVcblxuICBib3VuZHJ5Q2hhcjogY2hhcigxNzkpLFxuXG4gIG9ialN0YXJ0OiBjaGFyKDE5OCksXG4gIGFyclN0YXJ0OiBjaGFyKDIwNCksXG4gIGFycmF5RW5kOiBjaGFyKDE4NSksXG59O1xuXG5jb25zdCBjaGFyc0FyciA9IFtcbiAgY2hhcnMubmlsQ2hhcixcbiAgY2hhcnMubmlsUHJlbWl0aXZlLFxuICBjaGFycy5taXNzaW5nQ2hhcixcbiAgY2hhcnMubWlzc2luZ1ByZW1pdGl2ZSxcbiAgY2hhcnMuYm91bmRyeUNoYXIsXG4gIGNoYXJzLmVtcHR5Q2hhcixcbiAgY2hhcnMuZW1wdHlWYWx1ZSxcbiAgY2hhcnMuYXJyYXlFbmQsXG4gIGNoYXJzLm9ialN0YXJ0LFxuICBjaGFycy5hcnJTdGFydCxcbl07XG5cbmNvbnN0IF9lID0gZnVuY3Rpb24obm9kZSwgZV9zY2hlbWEsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBlX3NjaGVtYSA9PT0gJ3N0cmluZycpIHtcbiAgICAvL3ByZW1pdGl2ZVxuICAgIGlmIChub2RlICYmIG5vZGVbMF0gJiYgbm9kZVswXS52YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGdldFZhbHVlKG5vZGVbMF0udmFsLCBlX3NjaGVtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBnZXRWYWx1ZShub2RlLCBlX3NjaGVtYSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGhhc1ZhbGlkRGF0YSA9IGhhc0RhdGEobm9kZSk7XG4gICAgaWYgKGhhc1ZhbGlkRGF0YSA9PT0gdHJ1ZSkge1xuICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZV9zY2hlbWEpKSB7XG4gICAgICAgIC8vYXR0cmlidXRlcyBjYW4ndCBiZSByZXBlYXRlZC4gaGVuY2UgY2hlY2sgaW4gY2hpbGRyZW4gdGFncyBvbmx5XG4gICAgICAgIHN0ciArPSBjaGFycy5hcnJTdGFydDtcbiAgICAgICAgY29uc3QgaXRlbVNjaGVtYSA9IGVfc2NoZW1hWzBdO1xuICAgICAgICAvL3ZhciBpdGVtU2NoZW1hVHlwZSA9IGl0ZW1TY2hlbWE7XG4gICAgICAgIGNvbnN0IGFycl9sZW4gPSBub2RlLmxlbmd0aDtcblxuICAgICAgICBpZiAodHlwZW9mIGl0ZW1TY2hlbWEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgZm9yIChsZXQgYXJyX2kgPSAwOyBhcnJfaSA8IGFycl9sZW47IGFycl9pKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBnZXRWYWx1ZShub2RlW2Fycl9pXS52YWwsIGl0ZW1TY2hlbWEpO1xuICAgICAgICAgICAgc3RyID0gcHJvY2Vzc1ZhbHVlKHN0ciwgcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAobGV0IGFycl9pID0gMDsgYXJyX2kgPCBhcnJfbGVuOyBhcnJfaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByID0gX2Uobm9kZVthcnJfaV0sIGl0ZW1TY2hlbWEsIG9wdGlvbnMpO1xuICAgICAgICAgICAgc3RyID0gcHJvY2Vzc1ZhbHVlKHN0ciwgcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBjaGFycy5hcnJheUVuZDsgLy9pbmRpY2F0ZXMgdGhhdCBuZXh0IGl0ZW0gaXMgbm90IGFycmF5IGl0ZW1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vb2JqZWN0XG4gICAgICAgIHN0ciArPSBjaGFycy5vYmpTdGFydDtcbiAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGVfc2NoZW1hKTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgICBub2RlID0gbm9kZVswXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpIGluIGtleXMpIHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIC8vYSBwcm9wZXJ0eSBkZWZpbmVkIGluIHNjaGVtYSBjYW4gYmUgcHJlc2VudCBlaXRoZXIgaW4gYXR0cnNNYXAgb3IgY2hpbGRyZW4gdGFnc1xuICAgICAgICAgIC8vb3B0aW9ucy50ZXh0Tm9kZU5hbWUgd2lsbCBub3QgcHJlc2VudCBpbiBib3RoIG1hcHMsIHRha2UgaXQncyB2YWx1ZSBmcm9tIHZhbFxuICAgICAgICAgIC8vb3B0aW9ucy5hdHRyTm9kZU5hbWUgd2lsbCBiZSBwcmVzZW50IGluIGF0dHJzTWFwXG4gICAgICAgICAgbGV0IHI7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLmlnbm9yZUF0dHJpYnV0ZXMgJiYgbm9kZS5hdHRyc01hcCAmJiBub2RlLmF0dHJzTWFwW2tleV0pIHtcbiAgICAgICAgICAgIHIgPSBfZShub2RlLmF0dHJzTWFwW2tleV0sIGVfc2NoZW1hW2tleV0sIG9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSBvcHRpb25zLnRleHROb2RlTmFtZSkge1xuICAgICAgICAgICAgciA9IF9lKG5vZGUudmFsLCBlX3NjaGVtYVtrZXldLCBvcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgciA9IF9lKG5vZGUuY2hpbGRba2V5XSwgZV9zY2hlbWFba2V5XSwgb3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciA9IHByb2Nlc3NWYWx1ZShzdHIsIHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaGFzVmFsaWREYXRhO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0VmFsdWUgPSBmdW5jdGlvbihhIC8qLCB0eXBlKi8pIHtcbiAgc3dpdGNoIChhKSB7XG4gICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICByZXR1cm4gY2hhcnMubWlzc2luZ1ByZW1pdGl2ZTtcbiAgICBjYXNlIG51bGw6XG4gICAgICByZXR1cm4gY2hhcnMubmlsUHJlbWl0aXZlO1xuICAgIGNhc2UgJyc6XG4gICAgICByZXR1cm4gY2hhcnMuZW1wdHlWYWx1ZTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGE7XG4gIH1cbn07XG5cbmNvbnN0IHByb2Nlc3NWYWx1ZSA9IGZ1bmN0aW9uKHN0ciwgcikge1xuICBpZiAoIWlzQXBwQ2hhcihyWzBdKSAmJiAhaXNBcHBDaGFyKHN0cltzdHIubGVuZ3RoIC0gMV0pKSB7XG4gICAgc3RyICs9IGNoYXJzLmJvdW5kcnlDaGFyO1xuICB9XG4gIHJldHVybiBzdHIgKyByO1xufTtcblxuY29uc3QgaXNBcHBDaGFyID0gZnVuY3Rpb24oY2gpIHtcbiAgcmV0dXJuIGNoYXJzQXJyLmluZGV4T2YoY2gpICE9PSAtMTtcbn07XG5cbmZ1bmN0aW9uIGhhc0RhdGEoak9iaikge1xuICBpZiAoak9iaiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGNoYXJzLm1pc3NpbmdDaGFyO1xuICB9IGVsc2UgaWYgKGpPYmogPT09IG51bGwpIHtcbiAgICByZXR1cm4gY2hhcnMubmlsQ2hhcjtcbiAgfSBlbHNlIGlmIChcbiAgICBqT2JqLmNoaWxkICYmXG4gICAgT2JqZWN0LmtleXMoak9iai5jaGlsZCkubGVuZ3RoID09PSAwICYmXG4gICAgKCFqT2JqLmF0dHJzTWFwIHx8IE9iamVjdC5rZXlzKGpPYmouYXR0cnNNYXApLmxlbmd0aCA9PT0gMClcbiAgKSB7XG4gICAgcmV0dXJuIGNoYXJzLmVtcHR5Q2hhcjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jb25zdCB4MmogPSByZXF1aXJlKCcuL3htbHN0cjJ4bWxub2RlJyk7XG5jb25zdCBidWlsZE9wdGlvbnMgPSByZXF1aXJlKCcuL3V0aWwnKS5idWlsZE9wdGlvbnM7XG5cbmNvbnN0IGNvbnZlcnQybmltbiA9IGZ1bmN0aW9uKG5vZGUsIGVfc2NoZW1hLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBidWlsZE9wdGlvbnMob3B0aW9ucywgeDJqLmRlZmF1bHRPcHRpb25zLCB4MmoucHJvcHMpO1xuICByZXR1cm4gX2Uobm9kZSwgZV9zY2hlbWEsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0cy5jb252ZXJ0Mm5pbW4gPSBjb252ZXJ0Mm5pbW47XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuY29uc3QgY29udmVydFRvSnNvbiA9IGZ1bmN0aW9uKG5vZGUsIG9wdGlvbnMsIHBhcmVudFRhZ05hbWUpIHtcbiAgY29uc3Qgak9iaiA9IHt9O1xuXG4gIC8vIHdoZW4gbm8gY2hpbGQgbm9kZSBvciBhdHRyIGlzIHByZXNlbnRcbiAgaWYgKCghbm9kZS5jaGlsZCB8fCB1dGlsLmlzRW1wdHlPYmplY3Qobm9kZS5jaGlsZCkpICYmICghbm9kZS5hdHRyc01hcCB8fCB1dGlsLmlzRW1wdHlPYmplY3Qobm9kZS5hdHRyc01hcCkpKSB7XG4gICAgcmV0dXJuIHV0aWwuaXNFeGlzdChub2RlLnZhbCkgPyBub2RlLnZhbCA6ICcnO1xuICB9XG5cbiAgLy8gb3RoZXJ3aXNlIGNyZWF0ZSBhIHRleHRub2RlIGlmIG5vZGUgaGFzIHNvbWUgdGV4dFxuICBpZiAodXRpbC5pc0V4aXN0KG5vZGUudmFsKSAmJiAhKHR5cGVvZiBub2RlLnZhbCA9PT0gJ3N0cmluZycgJiYgKG5vZGUudmFsID09PSAnJyB8fCBub2RlLnZhbCA9PT0gb3B0aW9ucy5jZGF0YVBvc2l0aW9uQ2hhcikpKSB7XG4gICAgY29uc3QgYXNBcnJheSA9IHV0aWwuaXNUYWdOYW1lSW5BcnJheU1vZGUobm9kZS50YWduYW1lLCBvcHRpb25zLmFycmF5TW9kZSwgcGFyZW50VGFnTmFtZSlcbiAgICBqT2JqW29wdGlvbnMudGV4dE5vZGVOYW1lXSA9IGFzQXJyYXkgPyBbbm9kZS52YWxdIDogbm9kZS52YWw7XG4gIH1cblxuICB1dGlsLm1lcmdlKGpPYmosIG5vZGUuYXR0cnNNYXAsIG9wdGlvbnMuYXJyYXlNb2RlKTtcblxuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobm9kZS5jaGlsZCk7XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBrZXlzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIGNvbnN0IHRhZ05hbWUgPSBrZXlzW2luZGV4XTtcbiAgICBpZiAobm9kZS5jaGlsZFt0YWdOYW1lXSAmJiBub2RlLmNoaWxkW3RhZ05hbWVdLmxlbmd0aCA+IDEpIHtcbiAgICAgIGpPYmpbdGFnTmFtZV0gPSBbXTtcbiAgICAgIGZvciAobGV0IHRhZyBpbiBub2RlLmNoaWxkW3RhZ05hbWVdKSB7XG4gICAgICAgIGlmIChub2RlLmNoaWxkW3RhZ05hbWVdLmhhc093blByb3BlcnR5KHRhZykpIHtcbiAgICAgICAgICBqT2JqW3RhZ05hbWVdLnB1c2goY29udmVydFRvSnNvbihub2RlLmNoaWxkW3RhZ05hbWVdW3RhZ10sIG9wdGlvbnMsIHRhZ05hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBjb252ZXJ0VG9Kc29uKG5vZGUuY2hpbGRbdGFnTmFtZV1bMF0sIG9wdGlvbnMsIHRhZ05hbWUpO1xuICAgICAgY29uc3QgYXNBcnJheSA9IChvcHRpb25zLmFycmF5TW9kZSA9PT0gdHJ1ZSAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JykgfHwgdXRpbC5pc1RhZ05hbWVJbkFycmF5TW9kZSh0YWdOYW1lLCBvcHRpb25zLmFycmF5TW9kZSwgcGFyZW50VGFnTmFtZSk7XG4gICAgICBqT2JqW3RhZ05hbWVdID0gYXNBcnJheSA/IFtyZXN1bHRdIDogcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIC8vYWRkIHZhbHVlXG4gIHJldHVybiBqT2JqO1xufTtcblxuZXhwb3J0cy5jb252ZXJ0VG9Kc29uID0gY29udmVydFRvSnNvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuY29uc3QgYnVpbGRPcHRpb25zID0gcmVxdWlyZSgnLi91dGlsJykuYnVpbGRPcHRpb25zO1xuY29uc3QgeDJqID0gcmVxdWlyZSgnLi94bWxzdHIyeG1sbm9kZScpO1xuXG4vL1RPRE86IGRvIGl0IGxhdGVyXG5jb25zdCBjb252ZXJ0VG9Kc29uU3RyaW5nID0gZnVuY3Rpb24obm9kZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gYnVpbGRPcHRpb25zKG9wdGlvbnMsIHgyai5kZWZhdWx0T3B0aW9ucywgeDJqLnByb3BzKTtcblxuICBvcHRpb25zLmluZGVudEJ5ID0gb3B0aW9ucy5pbmRlbnRCeSB8fCAnJztcbiAgcmV0dXJuIF9jVG9Kc29uU3RyKG5vZGUsIG9wdGlvbnMsIDApO1xufTtcblxuY29uc3QgX2NUb0pzb25TdHIgPSBmdW5jdGlvbihub2RlLCBvcHRpb25zLCBsZXZlbCkge1xuICBsZXQgak9iaiA9ICd7JztcblxuICAvL3RyYXZlciB0aHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG5vZGUuY2hpbGQpO1xuXG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBrZXlzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIHZhciB0YWduYW1lID0ga2V5c1tpbmRleF07XG4gICAgaWYgKG5vZGUuY2hpbGRbdGFnbmFtZV0gJiYgbm9kZS5jaGlsZFt0YWduYW1lXS5sZW5ndGggPiAxKSB7XG4gICAgICBqT2JqICs9ICdcIicgKyB0YWduYW1lICsgJ1wiIDogWyAnO1xuICAgICAgZm9yICh2YXIgdGFnIGluIG5vZGUuY2hpbGRbdGFnbmFtZV0pIHtcbiAgICAgICAgak9iaiArPSBfY1RvSnNvblN0cihub2RlLmNoaWxkW3RhZ25hbWVdW3RhZ10sIG9wdGlvbnMpICsgJyAsICc7XG4gICAgICB9XG4gICAgICBqT2JqID0gak9iai5zdWJzdHIoMCwgak9iai5sZW5ndGggLSAxKSArICcgXSAnOyAvL3JlbW92ZSBleHRyYSBjb21tYSBpbiBsYXN0XG4gICAgfSBlbHNlIHtcbiAgICAgIGpPYmogKz0gJ1wiJyArIHRhZ25hbWUgKyAnXCIgOiAnICsgX2NUb0pzb25TdHIobm9kZS5jaGlsZFt0YWduYW1lXVswXSwgb3B0aW9ucykgKyAnICwnO1xuICAgIH1cbiAgfVxuICB1dGlsLm1lcmdlKGpPYmosIG5vZGUuYXR0cnNNYXApO1xuICAvL2FkZCBhdHRyc01hcCBhcyBuZXcgY2hpbGRyZW5cbiAgaWYgKHV0aWwuaXNFbXB0eU9iamVjdChqT2JqKSkge1xuICAgIHJldHVybiB1dGlsLmlzRXhpc3Qobm9kZS52YWwpID8gbm9kZS52YWwgOiAnJztcbiAgfSBlbHNlIHtcbiAgICBpZiAodXRpbC5pc0V4aXN0KG5vZGUudmFsKSkge1xuICAgICAgaWYgKCEodHlwZW9mIG5vZGUudmFsID09PSAnc3RyaW5nJyAmJiAobm9kZS52YWwgPT09ICcnIHx8IG5vZGUudmFsID09PSBvcHRpb25zLmNkYXRhUG9zaXRpb25DaGFyKSkpIHtcbiAgICAgICAgak9iaiArPSAnXCInICsgb3B0aW9ucy50ZXh0Tm9kZU5hbWUgKyAnXCIgOiAnICsgc3RyaW5ndmFsKG5vZGUudmFsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy9hZGQgdmFsdWVcbiAgaWYgKGpPYmpbak9iai5sZW5ndGggLSAxXSA9PT0gJywnKSB7XG4gICAgak9iaiA9IGpPYmouc3Vic3RyKDAsIGpPYmoubGVuZ3RoIC0gMik7XG4gIH1cbiAgcmV0dXJuIGpPYmogKyAnfSc7XG59O1xuXG5mdW5jdGlvbiBzdHJpbmd2YWwodikge1xuICBpZiAodiA9PT0gdHJ1ZSB8fCB2ID09PSBmYWxzZSB8fCAhaXNOYU4odikpIHtcbiAgICByZXR1cm4gdjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ1wiJyArIHYgKyAnXCInO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGVudGF0ZShvcHRpb25zLCBsZXZlbCkge1xuICByZXR1cm4gb3B0aW9ucy5pbmRlbnRCeS5yZXBlYXQobGV2ZWwpO1xufVxuXG5leHBvcnRzLmNvbnZlcnRUb0pzb25TdHJpbmcgPSBjb252ZXJ0VG9Kc29uU3RyaW5nO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBub2RlVG9Kc29uID0gcmVxdWlyZSgnLi9ub2RlMmpzb24nKTtcbmNvbnN0IHhtbFRvTm9kZW9iaiA9IHJlcXVpcmUoJy4veG1sc3RyMnhtbG5vZGUnKTtcbmNvbnN0IHgyeG1sbm9kZSA9IHJlcXVpcmUoJy4veG1sc3RyMnhtbG5vZGUnKTtcbmNvbnN0IGJ1aWxkT3B0aW9ucyA9IHJlcXVpcmUoJy4vdXRpbCcpLmJ1aWxkT3B0aW9ucztcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoJy4vdmFsaWRhdG9yJyk7XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbih4bWxEYXRhLCBvcHRpb25zLCB2YWxpZGF0aW9uT3B0aW9uKSB7XG4gIGlmKCB2YWxpZGF0aW9uT3B0aW9uKXtcbiAgICBpZih2YWxpZGF0aW9uT3B0aW9uID09PSB0cnVlKSB2YWxpZGF0aW9uT3B0aW9uID0ge31cbiAgICBcbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IudmFsaWRhdGUoeG1sRGF0YSwgdmFsaWRhdGlvbk9wdGlvbik7XG4gICAgaWYgKHJlc3VsdCAhPT0gdHJ1ZSkge1xuICAgICAgdGhyb3cgRXJyb3IoIHJlc3VsdC5lcnIubXNnKVxuICAgIH1cbiAgfVxuICBvcHRpb25zID0gYnVpbGRPcHRpb25zKG9wdGlvbnMsIHgyeG1sbm9kZS5kZWZhdWx0T3B0aW9ucywgeDJ4bWxub2RlLnByb3BzKTtcbiAgY29uc3QgdHJhdmVyc2FibGVPYmogPSB4bWxUb05vZGVvYmouZ2V0VHJhdmVyc2FsT2JqKHhtbERhdGEsIG9wdGlvbnMpXG4gIC8vcHJpbnQodHJhdmVyc2FibGVPYmosIFwiICBcIik7XG4gIHJldHVybiBub2RlVG9Kc29uLmNvbnZlcnRUb0pzb24odHJhdmVyc2FibGVPYmosIG9wdGlvbnMpO1xufTtcbmV4cG9ydHMuY29udmVydFRvbmltbiA9IHJlcXVpcmUoJy4vbmltbmRhdGEnKS5jb252ZXJ0Mm5pbW47XG5leHBvcnRzLmdldFRyYXZlcnNhbE9iaiA9IHhtbFRvTm9kZW9iai5nZXRUcmF2ZXJzYWxPYmo7XG5leHBvcnRzLmNvbnZlcnRUb0pzb24gPSBub2RlVG9Kc29uLmNvbnZlcnRUb0pzb247XG5leHBvcnRzLmNvbnZlcnRUb0pzb25TdHJpbmcgPSByZXF1aXJlKCcuL25vZGUyanNvbl9zdHInKS5jb252ZXJ0VG9Kc29uU3RyaW5nO1xuZXhwb3J0cy52YWxpZGF0ZSA9IHZhbGlkYXRvci52YWxpZGF0ZTtcbmV4cG9ydHMuajJ4UGFyc2VyID0gcmVxdWlyZSgnLi9qc29uMnhtbCcpO1xuZXhwb3J0cy5wYXJzZVRvTmltbiA9IGZ1bmN0aW9uKHhtbERhdGEsIHNjaGVtYSwgb3B0aW9ucykge1xuICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9uaW1uKGV4cG9ydHMuZ2V0VHJhdmVyc2FsT2JqKHhtbERhdGEsIG9wdGlvbnMpLCBzY2hlbWEsIG9wdGlvbnMpO1xufTtcblxuXG5mdW5jdGlvbiBwcmludCh4bWxOb2RlLCBpbmRlbnRhdGlvbil7XG4gIGlmKHhtbE5vZGUpe1xuICAgIGNvbnNvbGUubG9nKGluZGVudGF0aW9uICsgXCJ7XCIpXG4gICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyBcIiAgXFxcInRhZ05hbWVcXFwiOiBcXFwiXCIgKyB4bWxOb2RlLnRhZ25hbWUgKyBcIlxcXCIsIFwiKTtcbiAgICBpZih4bWxOb2RlLnBhcmVudCl7XG4gICAgICBjb25zb2xlLmxvZyhpbmRlbnRhdGlvbiArIFwiICBcXFwicGFyZW50XFxcIjogXFxcIlwiICsgeG1sTm9kZS5wYXJlbnQudGFnbmFtZSAgKyBcIlxcXCIsIFwiKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyBcIiAgXFxcInZhbFxcXCI6IFxcXCJcIiArIHhtbE5vZGUudmFsICArIFwiXFxcIiwgXCIpO1xuICAgIGNvbnNvbGUubG9nKGluZGVudGF0aW9uICsgXCIgIFxcXCJhdHRyc1xcXCI6IFwiICsgSlNPTi5zdHJpbmdpZnkoeG1sTm9kZS5hdHRyc01hcCxudWxsLDQpICArIFwiLCBcIik7XG5cbiAgICBpZih4bWxOb2RlLmNoaWxkKXtcbiAgICAgIGNvbnNvbGUubG9nKGluZGVudGF0aW9uICsgXCJcXFwiY2hpbGRcXFwiOiB7XCIpXG4gICAgICBjb25zdCBpbmRlbnRhdGlvbjIgPSBpbmRlbnRhdGlvbiArIGluZGVudGF0aW9uO1xuICAgICAgT2JqZWN0LmtleXMoeG1sTm9kZS5jaGlsZCkuZm9yRWFjaCggZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB4bWxOb2RlLmNoaWxkW2tleV07XG5cbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShub2RlKSl7XG4gICAgICAgICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyAgXCJcXFwiXCIra2V5K1wiXFxcIiA6W1wiKVxuICAgICAgICAgIG5vZGUuZm9yRWFjaCggZnVuY3Rpb24oaXRlbSxpbmRleCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhpbmRlbnRhdGlvbiArIFwiIFxcXCJcIitpbmRleCtcIlxcXCIgOiBbXCIpXG4gICAgICAgICAgICBwcmludChpdGVtLCBpbmRlbnRhdGlvbjIpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyBcIl0sXCIpICBcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyBcIiBcXFwiXCIra2V5K1wiXFxcIiA6IHtcIilcbiAgICAgICAgICBwcmludChub2RlLCBpbmRlbnRhdGlvbjIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGluZGVudGF0aW9uICsgXCJ9LFwiKSAgXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coaW5kZW50YXRpb24gKyBcIn0sXCIpXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGluZGVudGF0aW9uICsgXCJ9LFwiKVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IG5hbWVTdGFydENoYXIgPSAnOkEtWmEtel9cXFxcdTAwQzAtXFxcXHUwMEQ2XFxcXHUwMEQ4LVxcXFx1MDBGNlxcXFx1MDBGOC1cXFxcdTAyRkZcXFxcdTAzNzAtXFxcXHUwMzdEXFxcXHUwMzdGLVxcXFx1MUZGRlxcXFx1MjAwQy1cXFxcdTIwMERcXFxcdTIwNzAtXFxcXHUyMThGXFxcXHUyQzAwLVxcXFx1MkZFRlxcXFx1MzAwMS1cXFxcdUQ3RkZcXFxcdUY5MDAtXFxcXHVGRENGXFxcXHVGREYwLVxcXFx1RkZGRCc7XG5jb25zdCBuYW1lQ2hhciA9IG5hbWVTdGFydENoYXIgKyAnXFxcXC0uXFxcXGRcXFxcdTAwQjdcXFxcdTAzMDAtXFxcXHUwMzZGXFxcXHUyMDNGLVxcXFx1MjA0MCc7XG5jb25zdCBuYW1lUmVnZXhwID0gJ1snICsgbmFtZVN0YXJ0Q2hhciArICddWycgKyBuYW1lQ2hhciArICddKidcbmNvbnN0IHJlZ2V4TmFtZSA9IG5ldyBSZWdFeHAoJ14nICsgbmFtZVJlZ2V4cCArICckJyk7XG5cbmNvbnN0IGdldEFsbE1hdGNoZXMgPSBmdW5jdGlvbihzdHJpbmcsIHJlZ2V4KSB7XG4gIGNvbnN0IG1hdGNoZXMgPSBbXTtcbiAgbGV0IG1hdGNoID0gcmVnZXguZXhlYyhzdHJpbmcpO1xuICB3aGlsZSAobWF0Y2gpIHtcbiAgICBjb25zdCBhbGxtYXRjaGVzID0gW107XG4gICAgY29uc3QgbGVuID0gbWF0Y2gubGVuZ3RoO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICAgIGFsbG1hdGNoZXMucHVzaChtYXRjaFtpbmRleF0pO1xuICAgIH1cbiAgICBtYXRjaGVzLnB1c2goYWxsbWF0Y2hlcyk7XG4gICAgbWF0Y2ggPSByZWdleC5leGVjKHN0cmluZyk7XG4gIH1cbiAgcmV0dXJuIG1hdGNoZXM7XG59O1xuXG5jb25zdCBpc05hbWUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgY29uc3QgbWF0Y2ggPSByZWdleE5hbWUuZXhlYyhzdHJpbmcpO1xuICByZXR1cm4gIShtYXRjaCA9PT0gbnVsbCB8fCB0eXBlb2YgbWF0Y2ggPT09ICd1bmRlZmluZWQnKTtcbn07XG5cbmV4cG9ydHMuaXNFeGlzdCA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIHR5cGVvZiB2ICE9PSAndW5kZWZpbmVkJztcbn07XG5cbmV4cG9ydHMuaXNFbXB0eU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7XG59O1xuXG4vKipcbiAqIENvcHkgYWxsIHRoZSBwcm9wZXJ0aWVzIG9mIGEgaW50byBiLlxuICogQHBhcmFtIHsqfSB0YXJnZXRcbiAqIEBwYXJhbSB7Kn0gYVxuICovXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24odGFyZ2V0LCBhLCBhcnJheU1vZGUpIHtcbiAgaWYgKGEpIHtcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoYSk7IC8vIHdpbGwgcmV0dXJuIGFuIGFycmF5IG9mIG93biBwcm9wZXJ0aWVzXG4gICAgY29uc3QgbGVuID0ga2V5cy5sZW5ndGg7IC8vZG9uJ3QgbWFrZSBpdCBpbmxpbmVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoYXJyYXlNb2RlID09PSAnc3RyaWN0Jykge1xuICAgICAgICB0YXJnZXRba2V5c1tpXV0gPSBbIGFba2V5c1tpXV0gXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtrZXlzW2ldXSA9IGFba2V5c1tpXV07XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuLyogZXhwb3J0cy5tZXJnZSA9ZnVuY3Rpb24gKGIsYSl7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKGIsYSk7XG59ICovXG5cbmV4cG9ydHMuZ2V0VmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gIGlmIChleHBvcnRzLmlzRXhpc3QodikpIHtcbiAgICByZXR1cm4gdjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbi8vIGNvbnN0IGZha2VDYWxsID0gZnVuY3Rpb24oYSkge3JldHVybiBhO307XG4vLyBjb25zdCBmYWtlQ2FsbE5vUmV0dXJuID0gZnVuY3Rpb24oKSB7fTtcblxuZXhwb3J0cy5idWlsZE9wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zLCBkZWZhdWx0T3B0aW9ucywgcHJvcHMpIHtcbiAgdmFyIG5ld09wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRPcHRpb25zOyAvL2lmIHRoZXJlIGFyZSBub3Qgb3B0aW9uc1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChvcHRpb25zW3Byb3BzW2ldXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdPcHRpb25zW3Byb3BzW2ldXSA9IG9wdGlvbnNbcHJvcHNbaV1dO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXdPcHRpb25zW3Byb3BzW2ldXSA9IGRlZmF1bHRPcHRpb25zW3Byb3BzW2ldXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ld09wdGlvbnM7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGEgdGFnIG5hbWUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYXJyYXlcbiAqXG4gKiBAcGFyYW0gdGFnTmFtZSB0aGUgbm9kZSB0YWduYW1lXG4gKiBAcGFyYW0gYXJyYXlNb2RlIHRoZSBhcnJheSBtb2RlIG9wdGlvblxuICogQHBhcmFtIHBhcmVudFRhZ05hbWUgdGhlIHBhcmVudCB0YWcgbmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgbm9kZSBzaG91bGQgYmUgcGFyc2VkIGFzIGFycmF5XG4gKi9cbmV4cG9ydHMuaXNUYWdOYW1lSW5BcnJheU1vZGUgPSBmdW5jdGlvbiAodGFnTmFtZSwgYXJyYXlNb2RlLCBwYXJlbnRUYWdOYW1lKSB7XG4gIGlmIChhcnJheU1vZGUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGFycmF5TW9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiBhcnJheU1vZGUudGVzdCh0YWdOYW1lKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYXJyYXlNb2RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuICEhYXJyYXlNb2RlKHRhZ05hbWUsIHBhcmVudFRhZ05hbWUpO1xuICB9XG5cbiAgcmV0dXJuIGFycmF5TW9kZSA9PT0gXCJzdHJpY3RcIjtcbn1cblxuZXhwb3J0cy5pc05hbWUgPSBpc05hbWU7XG5leHBvcnRzLmdldEFsbE1hdGNoZXMgPSBnZXRBbGxNYXRjaGVzO1xuZXhwb3J0cy5uYW1lUmVnZXhwID0gbmFtZVJlZ2V4cDtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgYWxsb3dCb29sZWFuQXR0cmlidXRlczogZmFsc2UsIC8vQSB0YWcgY2FuIGhhdmUgYXR0cmlidXRlcyB3aXRob3V0IGFueSB2YWx1ZVxufTtcblxuY29uc3QgcHJvcHMgPSBbJ2FsbG93Qm9vbGVhbkF0dHJpYnV0ZXMnXTtcblxuLy9jb25zdCB0YWdzUGF0dGVybiA9IG5ldyBSZWdFeHAoXCI8XFxcXC8/KFtcXFxcdzpcXFxcLV9cXC5dKylcXFxccypcXC8/PlwiLFwiZ1wiKTtcbmV4cG9ydHMudmFsaWRhdGUgPSBmdW5jdGlvbiAoeG1sRGF0YSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gdXRpbC5idWlsZE9wdGlvbnMob3B0aW9ucywgZGVmYXVsdE9wdGlvbnMsIHByb3BzKTtcblxuICAvL3htbERhdGEgPSB4bWxEYXRhLnJlcGxhY2UoLyhcXHJcXG58XFxufFxccikvZ20sXCJcIik7Ly9tYWtlIGl0IHNpbmdsZSBsaW5lXG4gIC8veG1sRGF0YSA9IHhtbERhdGEucmVwbGFjZSgvKF5cXHMqPFxcP3htbC4qP1xcPz4pL2csXCJcIik7Ly9SZW1vdmUgWE1MIHN0YXJ0aW5nIHRhZ1xuICAvL3htbERhdGEgPSB4bWxEYXRhLnJlcGxhY2UoLyg8IURPQ1RZUEVbXFxzXFx3XFxcIlxcLlxcL1xcLVxcOl0rKFxcWy4qXFxdKSpcXHMqPikvZyxcIlwiKTsvL1JlbW92ZSBET0NUWVBFXG4gIGNvbnN0IHRhZ3MgPSBbXTtcbiAgbGV0IHRhZ0ZvdW5kID0gZmFsc2U7XG5cbiAgLy9pbmRpY2F0ZXMgdGhhdCB0aGUgcm9vdCB0YWcgaGFzIGJlZW4gY2xvc2VkIChha2EuIGRlcHRoIDAgaGFzIGJlZW4gcmVhY2hlZClcbiAgbGV0IHJlYWNoZWRSb290ID0gZmFsc2U7XG5cbiAgaWYgKHhtbERhdGFbMF0gPT09ICdcXHVmZWZmJykge1xuICAgIC8vIGNoZWNrIGZvciBieXRlIG9yZGVyIG1hcmsgKEJPTSlcbiAgICB4bWxEYXRhID0geG1sRGF0YS5zdWJzdHIoMSk7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHhtbERhdGEubGVuZ3RoOyBpKyspIHtcblxuICAgIGlmICh4bWxEYXRhW2ldID09PSAnPCcgJiYgeG1sRGF0YVtpKzFdID09PSAnPycpIHtcbiAgICAgIGkrPTI7XG4gICAgICBpID0gcmVhZFBJKHhtbERhdGEsaSk7XG4gICAgICBpZiAoaS5lcnIpIHJldHVybiBpO1xuICAgIH1lbHNlIGlmICh4bWxEYXRhW2ldID09PSAnPCcpIHtcbiAgICAgIC8vc3RhcnRpbmcgb2YgdGFnXG4gICAgICAvL3JlYWQgdW50aWwgeW91IHJlYWNoIHRvICc+JyBhdm9pZGluZyBhbnkgJz4nIGluIGF0dHJpYnV0ZSB2YWx1ZVxuXG4gICAgICBpKys7XG4gICAgICBcbiAgICAgIGlmICh4bWxEYXRhW2ldID09PSAnIScpIHtcbiAgICAgICAgaSA9IHJlYWRDb21tZW50QW5kQ0RBVEEoeG1sRGF0YSwgaSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGNsb3NpbmdUYWcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHhtbERhdGFbaV0gPT09ICcvJykge1xuICAgICAgICAgIC8vY2xvc2luZyB0YWdcbiAgICAgICAgICBjbG9zaW5nVGFnID0gdHJ1ZTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgLy9yZWFkIHRhZ25hbWVcbiAgICAgICAgbGV0IHRhZ05hbWUgPSAnJztcbiAgICAgICAgZm9yICg7IGkgPCB4bWxEYXRhLmxlbmd0aCAmJlxuICAgICAgICAgIHhtbERhdGFbaV0gIT09ICc+JyAmJlxuICAgICAgICAgIHhtbERhdGFbaV0gIT09ICcgJyAmJlxuICAgICAgICAgIHhtbERhdGFbaV0gIT09ICdcXHQnICYmXG4gICAgICAgICAgeG1sRGF0YVtpXSAhPT0gJ1xcbicgJiZcbiAgICAgICAgICB4bWxEYXRhW2ldICE9PSAnXFxyJzsgaSsrXG4gICAgICAgICkge1xuICAgICAgICAgIHRhZ05hbWUgKz0geG1sRGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICB0YWdOYW1lID0gdGFnTmFtZS50cmltKCk7XG4gICAgICAgIC8vY29uc29sZS5sb2codGFnTmFtZSk7XG5cbiAgICAgICAgaWYgKHRhZ05hbWVbdGFnTmFtZS5sZW5ndGggLSAxXSA9PT0gJy8nKSB7XG4gICAgICAgICAgLy9zZWxmIGNsb3NpbmcgdGFnIHdpdGhvdXQgYXR0cmlidXRlc1xuICAgICAgICAgIHRhZ05hbWUgPSB0YWdOYW1lLnN1YnN0cmluZygwLCB0YWdOYW1lLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIC8vY29udGludWU7XG4gICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdmFsaWRhdGVUYWdOYW1lKHRhZ05hbWUpKSB7XG4gICAgICAgICAgbGV0IG1zZztcbiAgICAgICAgICBpZiAodGFnTmFtZS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBtc2cgPSBcIlRoZXJlIGlzIGFuIHVubmVjZXNzYXJ5IHNwYWNlIGJldHdlZW4gdGFnIG5hbWUgYW5kIGJhY2t3YXJkIHNsYXNoICc8LyAuLicuXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1zZyA9IFwiVGFnICdcIit0YWdOYW1lK1wiJyBpcyBhbiBpbnZhbGlkIG5hbWUuXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZFRhZycsIG1zZywgZ2V0TGluZU51bWJlckZvclBvc2l0aW9uKHhtbERhdGEsIGkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHJlYWRBdHRyaWJ1dGVTdHIoeG1sRGF0YSwgaSk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgcmV0dXJuIGdldEVycm9yT2JqZWN0KCdJbnZhbGlkQXR0cicsIFwiQXR0cmlidXRlcyBmb3IgJ1wiK3RhZ05hbWUrXCInIGhhdmUgb3BlbiBxdW90ZS5cIiwgZ2V0TGluZU51bWJlckZvclBvc2l0aW9uKHhtbERhdGEsIGkpKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYXR0clN0ciA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgaSA9IHJlc3VsdC5pbmRleDtcblxuICAgICAgICBpZiAoYXR0clN0clthdHRyU3RyLmxlbmd0aCAtIDFdID09PSAnLycpIHtcbiAgICAgICAgICAvL3NlbGYgY2xvc2luZyB0YWdcbiAgICAgICAgICBhdHRyU3RyID0gYXR0clN0ci5zdWJzdHJpbmcoMCwgYXR0clN0ci5sZW5ndGggLSAxKTtcbiAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gdmFsaWRhdGVBdHRyaWJ1dGVTdHJpbmcoYXR0clN0ciwgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKGlzVmFsaWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHRhZ0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vY29udGludWU7IC8vdGV4dCBtYXkgcHJlc2VudHMgYWZ0ZXIgc2VsZiBjbG9zaW5nIHRhZ1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL3RoZSByZXN1bHQgZnJvbSB0aGUgbmVzdGVkIGZ1bmN0aW9uIHJldHVybnMgdGhlIHBvc2l0aW9uIG9mIHRoZSBlcnJvciB3aXRoaW4gdGhlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy9pbiBvcmRlciB0byBnZXQgdGhlICd0cnVlJyBlcnJvciBsaW5lLCB3ZSBuZWVkIHRvIGNhbGN1bGF0ZSB0aGUgcG9zaXRpb24gd2hlcmUgdGhlIGF0dHJpYnV0ZSBiZWdpbnMgKGkgLSBhdHRyU3RyLmxlbmd0aCkgYW5kIHRoZW4gYWRkIHRoZSBwb3NpdGlvbiB3aXRoaW4gdGhlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy90aGlzIGdpdmVzIHVzIHRoZSBhYnNvbHV0ZSBpbmRleCBpbiB0aGUgZW50aXJlIHhtbCwgd2hpY2ggd2UgY2FuIHVzZSB0byBmaW5kIHRoZSBsaW5lIGF0IGxhc3RcbiAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdChpc1ZhbGlkLmVyci5jb2RlLCBpc1ZhbGlkLmVyci5tc2csIGdldExpbmVOdW1iZXJGb3JQb3NpdGlvbih4bWxEYXRhLCBpIC0gYXR0clN0ci5sZW5ndGggKyBpc1ZhbGlkLmVyci5saW5lKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNsb3NpbmdUYWcpIHtcbiAgICAgICAgICBpZiAoIXJlc3VsdC50YWdDbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZFRhZycsIFwiQ2xvc2luZyB0YWcgJ1wiK3RhZ05hbWUrXCInIGRvZXNuJ3QgaGF2ZSBwcm9wZXIgY2xvc2luZy5cIiwgZ2V0TGluZU51bWJlckZvclBvc2l0aW9uKHhtbERhdGEsIGkpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJTdHIudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZFRhZycsIFwiQ2xvc2luZyB0YWcgJ1wiK3RhZ05hbWUrXCInIGNhbid0IGhhdmUgYXR0cmlidXRlcyBvciBpbnZhbGlkIHN0YXJ0aW5nLlwiLCBnZXRMaW5lTnVtYmVyRm9yUG9zaXRpb24oeG1sRGF0YSwgaSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvdGcgPSB0YWdzLnBvcCgpO1xuICAgICAgICAgICAgaWYgKHRhZ05hbWUgIT09IG90Zykge1xuICAgICAgICAgICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRUYWcnLCBcIkNsb3NpbmcgdGFnICdcIitvdGcrXCInIGlzIGV4cGVjdGVkIGlucGxhY2Ugb2YgJ1wiK3RhZ05hbWUrXCInLlwiLCBnZXRMaW5lTnVtYmVyRm9yUG9zaXRpb24oeG1sRGF0YSwgaSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3doZW4gdGhlcmUgYXJlIG5vIG1vcmUgdGFncywgd2UgcmVhY2hlZCB0aGUgcm9vdCBsZXZlbC5cbiAgICAgICAgICAgIGlmICh0YWdzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgIHJlYWNoZWRSb290ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgaXNWYWxpZCA9IHZhbGlkYXRlQXR0cmlidXRlU3RyaW5nKGF0dHJTdHIsIG9wdGlvbnMpO1xuICAgICAgICAgIGlmIChpc1ZhbGlkICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAvL3RoZSByZXN1bHQgZnJvbSB0aGUgbmVzdGVkIGZ1bmN0aW9uIHJldHVybnMgdGhlIHBvc2l0aW9uIG9mIHRoZSBlcnJvciB3aXRoaW4gdGhlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy9pbiBvcmRlciB0byBnZXQgdGhlICd0cnVlJyBlcnJvciBsaW5lLCB3ZSBuZWVkIHRvIGNhbGN1bGF0ZSB0aGUgcG9zaXRpb24gd2hlcmUgdGhlIGF0dHJpYnV0ZSBiZWdpbnMgKGkgLSBhdHRyU3RyLmxlbmd0aCkgYW5kIHRoZW4gYWRkIHRoZSBwb3NpdGlvbiB3aXRoaW4gdGhlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy90aGlzIGdpdmVzIHVzIHRoZSBhYnNvbHV0ZSBpbmRleCBpbiB0aGUgZW50aXJlIHhtbCwgd2hpY2ggd2UgY2FuIHVzZSB0byBmaW5kIHRoZSBsaW5lIGF0IGxhc3RcbiAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdChpc1ZhbGlkLmVyci5jb2RlLCBpc1ZhbGlkLmVyci5tc2csIGdldExpbmVOdW1iZXJGb3JQb3NpdGlvbih4bWxEYXRhLCBpIC0gYXR0clN0ci5sZW5ndGggKyBpc1ZhbGlkLmVyci5saW5lKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy9pZiB0aGUgcm9vdCBsZXZlbCBoYXMgYmVlbiByZWFjaGVkIGJlZm9yZSAuLi5cbiAgICAgICAgICBpZiAocmVhY2hlZFJvb3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZFhtbCcsICdNdWx0aXBsZSBwb3NzaWJsZSByb290IG5vZGVzIGZvdW5kLicsIGdldExpbmVOdW1iZXJGb3JQb3NpdGlvbih4bWxEYXRhLCBpKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhZ3MucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnRm91bmQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9za2lwIHRhZyB0ZXh0IHZhbHVlXG4gICAgICAgIC8vSXQgbWF5IGluY2x1ZGUgY29tbWVudHMgYW5kIENEQVRBIHZhbHVlXG4gICAgICAgIGZvciAoaSsrOyBpIDwgeG1sRGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICh4bWxEYXRhW2ldID09PSAnPCcpIHtcbiAgICAgICAgICAgIGlmICh4bWxEYXRhW2kgKyAxXSA9PT0gJyEnKSB7XG4gICAgICAgICAgICAgIC8vY29tbWVudCBvciBDQURBVEFcbiAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICBpID0gcmVhZENvbW1lbnRBbmRDREFUQSh4bWxEYXRhLCBpKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHhtbERhdGFbaSsxXSA9PT0gJz8nKSB7XG4gICAgICAgICAgICAgIGkgPSByZWFkUEkoeG1sRGF0YSwgKytpKTtcbiAgICAgICAgICAgICAgaWYgKGkuZXJyKSByZXR1cm4gaTtcbiAgICAgICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh4bWxEYXRhW2ldID09PSAnJicpIHtcbiAgICAgICAgICAgIGNvbnN0IGFmdGVyQW1wID0gdmFsaWRhdGVBbXBlcnNhbmQoeG1sRGF0YSwgaSk7XG4gICAgICAgICAgICBpZiAoYWZ0ZXJBbXAgPT0gLTEpXG4gICAgICAgICAgICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZENoYXInLCBcImNoYXIgJyYnIGlzIG5vdCBleHBlY3RlZC5cIiwgZ2V0TGluZU51bWJlckZvclBvc2l0aW9uKHhtbERhdGEsIGkpKTtcbiAgICAgICAgICAgIGkgPSBhZnRlckFtcDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gLy9lbmQgb2YgcmVhZGluZyB0YWcgdGV4dCB2YWx1ZVxuICAgICAgICBpZiAoeG1sRGF0YVtpXSA9PT0gJzwnKSB7XG4gICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh4bWxEYXRhW2ldID09PSAnICcgfHwgeG1sRGF0YVtpXSA9PT0gJ1xcdCcgfHwgeG1sRGF0YVtpXSA9PT0gJ1xcbicgfHwgeG1sRGF0YVtpXSA9PT0gJ1xccicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRDaGFyJywgXCJjaGFyICdcIit4bWxEYXRhW2ldK1wiJyBpcyBub3QgZXhwZWN0ZWQuXCIsIGdldExpbmVOdW1iZXJGb3JQb3NpdGlvbih4bWxEYXRhLCBpKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF0YWdGb3VuZCkge1xuICAgIHJldHVybiBnZXRFcnJvck9iamVjdCgnSW52YWxpZFhtbCcsICdTdGFydCB0YWcgZXhwZWN0ZWQuJywgMSk7XG4gIH0gZWxzZSBpZiAodGFncy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIGdldEVycm9yT2JqZWN0KCdJbnZhbGlkWG1sJywgXCJJbnZhbGlkICdcIitKU09OLnN0cmluZ2lmeSh0YWdzLCBudWxsLCA0KS5yZXBsYWNlKC9cXHI/XFxuL2csICcnKStcIicgZm91bmQuXCIsIDEpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlYWQgUHJvY2Vzc2luZyBpbnNzdHJ1Y3Rpb25zIGFuZCBza2lwXG4gKiBAcGFyYW0geyp9IHhtbERhdGFcbiAqIEBwYXJhbSB7Kn0gaVxuICovXG5mdW5jdGlvbiByZWFkUEkoeG1sRGF0YSwgaSkge1xuICB2YXIgc3RhcnQgPSBpO1xuICBmb3IgKDsgaSA8IHhtbERhdGEubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoeG1sRGF0YVtpXSA9PSAnPycgfHwgeG1sRGF0YVtpXSA9PSAnICcpIHtcbiAgICAgIC8vdGFnbmFtZVxuICAgICAgdmFyIHRhZ25hbWUgPSB4bWxEYXRhLnN1YnN0cihzdGFydCwgaSAtIHN0YXJ0KTtcbiAgICAgIGlmIChpID4gNSAmJiB0YWduYW1lID09PSAneG1sJykge1xuICAgICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRYbWwnLCAnWE1MIGRlY2xhcmF0aW9uIGFsbG93ZWQgb25seSBhdCB0aGUgc3RhcnQgb2YgdGhlIGRvY3VtZW50LicsIGdldExpbmVOdW1iZXJGb3JQb3NpdGlvbih4bWxEYXRhLCBpKSk7XG4gICAgICB9IGVsc2UgaWYgKHhtbERhdGFbaV0gPT0gJz8nICYmIHhtbERhdGFbaSArIDFdID09ICc+Jykge1xuICAgICAgICAvL2NoZWNrIGlmIHZhbGlkIGF0dHJpYnV0IHN0cmluZ1xuICAgICAgICBpKys7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiByZWFkQ29tbWVudEFuZENEQVRBKHhtbERhdGEsIGkpIHtcbiAgaWYgKHhtbERhdGEubGVuZ3RoID4gaSArIDUgJiYgeG1sRGF0YVtpICsgMV0gPT09ICctJyAmJiB4bWxEYXRhW2kgKyAyXSA9PT0gJy0nKSB7XG4gICAgLy9jb21tZW50XG4gICAgZm9yIChpICs9IDM7IGkgPCB4bWxEYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoeG1sRGF0YVtpXSA9PT0gJy0nICYmIHhtbERhdGFbaSArIDFdID09PSAnLScgJiYgeG1sRGF0YVtpICsgMl0gPT09ICc+Jykge1xuICAgICAgICBpICs9IDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChcbiAgICB4bWxEYXRhLmxlbmd0aCA+IGkgKyA4ICYmXG4gICAgeG1sRGF0YVtpICsgMV0gPT09ICdEJyAmJlxuICAgIHhtbERhdGFbaSArIDJdID09PSAnTycgJiZcbiAgICB4bWxEYXRhW2kgKyAzXSA9PT0gJ0MnICYmXG4gICAgeG1sRGF0YVtpICsgNF0gPT09ICdUJyAmJlxuICAgIHhtbERhdGFbaSArIDVdID09PSAnWScgJiZcbiAgICB4bWxEYXRhW2kgKyA2XSA9PT0gJ1AnICYmXG4gICAgeG1sRGF0YVtpICsgN10gPT09ICdFJ1xuICApIHtcbiAgICBsZXQgYW5nbGVCcmFja2V0c0NvdW50ID0gMTtcbiAgICBmb3IgKGkgKz0gODsgaSA8IHhtbERhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh4bWxEYXRhW2ldID09PSAnPCcpIHtcbiAgICAgICAgYW5nbGVCcmFja2V0c0NvdW50Kys7XG4gICAgICB9IGVsc2UgaWYgKHhtbERhdGFbaV0gPT09ICc+Jykge1xuICAgICAgICBhbmdsZUJyYWNrZXRzQ291bnQtLTtcbiAgICAgICAgaWYgKGFuZ2xlQnJhY2tldHNDb3VudCA9PT0gMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKFxuICAgIHhtbERhdGEubGVuZ3RoID4gaSArIDkgJiZcbiAgICB4bWxEYXRhW2kgKyAxXSA9PT0gJ1snICYmXG4gICAgeG1sRGF0YVtpICsgMl0gPT09ICdDJyAmJlxuICAgIHhtbERhdGFbaSArIDNdID09PSAnRCcgJiZcbiAgICB4bWxEYXRhW2kgKyA0XSA9PT0gJ0EnICYmXG4gICAgeG1sRGF0YVtpICsgNV0gPT09ICdUJyAmJlxuICAgIHhtbERhdGFbaSArIDZdID09PSAnQScgJiZcbiAgICB4bWxEYXRhW2kgKyA3XSA9PT0gJ1snXG4gICkge1xuICAgIGZvciAoaSArPSA4OyBpIDwgeG1sRGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHhtbERhdGFbaV0gPT09ICddJyAmJiB4bWxEYXRhW2kgKyAxXSA9PT0gJ10nICYmIHhtbERhdGFbaSArIDJdID09PSAnPicpIHtcbiAgICAgICAgaSArPSAyO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gaTtcbn1cblxudmFyIGRvdWJsZVF1b3RlID0gJ1wiJztcbnZhciBzaW5nbGVRdW90ZSA9IFwiJ1wiO1xuXG4vKipcbiAqIEtlZXAgcmVhZGluZyB4bWxEYXRhIHVudGlsICc8JyBpcyBmb3VuZCBvdXRzaWRlIHRoZSBhdHRyaWJ1dGUgdmFsdWUuXG4gKiBAcGFyYW0ge3N0cmluZ30geG1sRGF0YVxuICogQHBhcmFtIHtudW1iZXJ9IGlcbiAqL1xuZnVuY3Rpb24gcmVhZEF0dHJpYnV0ZVN0cih4bWxEYXRhLCBpKSB7XG4gIGxldCBhdHRyU3RyID0gJyc7XG4gIGxldCBzdGFydENoYXIgPSAnJztcbiAgbGV0IHRhZ0Nsb3NlZCA9IGZhbHNlO1xuICBmb3IgKDsgaSA8IHhtbERhdGEubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoeG1sRGF0YVtpXSA9PT0gZG91YmxlUXVvdGUgfHwgeG1sRGF0YVtpXSA9PT0gc2luZ2xlUXVvdGUpIHtcbiAgICAgIGlmIChzdGFydENoYXIgPT09ICcnKSB7XG4gICAgICAgIHN0YXJ0Q2hhciA9IHhtbERhdGFbaV07XG4gICAgICB9IGVsc2UgaWYgKHN0YXJ0Q2hhciAhPT0geG1sRGF0YVtpXSkge1xuICAgICAgICAvL2lmIHZhdWUgaXMgZW5jbG9zZWQgd2l0aCBkb3VibGUgcXVvdGUgdGhlbiBzaW5nbGUgcXVvdGVzIGFyZSBhbGxvd2VkIGluc2lkZSB0aGUgdmFsdWUgYW5kIHZpY2UgdmVyc2FcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGFydENoYXIgPSAnJztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHhtbERhdGFbaV0gPT09ICc+Jykge1xuICAgICAgaWYgKHN0YXJ0Q2hhciA9PT0gJycpIHtcbiAgICAgICAgdGFnQ2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGF0dHJTdHIgKz0geG1sRGF0YVtpXTtcbiAgfVxuICBpZiAoc3RhcnRDaGFyICE9PSAnJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFsdWU6IGF0dHJTdHIsXG4gICAgaW5kZXg6IGksXG4gICAgdGFnQ2xvc2VkOiB0YWdDbG9zZWRcbiAgfTtcbn1cblxuLyoqXG4gKiBTZWxlY3QgYWxsIHRoZSBhdHRyaWJ1dGVzIHdoZXRoZXIgdmFsaWQgb3IgaW52YWxpZC5cbiAqL1xuY29uc3QgdmFsaWRBdHRyU3RyUmVneHAgPSBuZXcgUmVnRXhwKCcoXFxcXHMqKShbXlxcXFxzPV0rKShcXFxccyo9KT8oXFxcXHMqKFtcXCdcIl0pKChbXFxcXHNcXFxcU10pKj8pXFxcXDUpPycsICdnJyk7XG5cbi8vYXR0ciwgPVwic2RcIiwgYT1cImFtaXQnc1wiLCBhPVwic2RcImI9XCJzYWZcIiwgYWIgIGNkPVwiXCJcblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyaWJ1dGVTdHJpbmcoYXR0clN0ciwgb3B0aW9ucykge1xuICAvL2NvbnNvbGUubG9nKFwic3RhcnQ6XCIrYXR0clN0citcIjplbmRcIik7XG5cbiAgLy9pZihhdHRyU3RyLnRyaW0oKS5sZW5ndGggPT09IDApIHJldHVybiB0cnVlOyAvL2VtcHR5IHN0cmluZ1xuXG4gIGNvbnN0IG1hdGNoZXMgPSB1dGlsLmdldEFsbE1hdGNoZXMoYXR0clN0ciwgdmFsaWRBdHRyU3RyUmVneHApO1xuICBjb25zdCBhdHRyTmFtZXMgPSB7fTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdGNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobWF0Y2hlc1tpXVsxXS5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vbm9zcGFjZSBiZWZvcmUgYXR0cmlidXRlIG5hbWU6IGE9XCJzZFwiYj1cInNhZlwiXG4gICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRBdHRyJywgXCJBdHRyaWJ1dGUgJ1wiK21hdGNoZXNbaV1bMl0rXCInIGhhcyBubyBzcGFjZSBpbiBzdGFydGluZy5cIiwgZ2V0UG9zaXRpb25Gcm9tTWF0Y2goYXR0clN0ciwgbWF0Y2hlc1tpXVswXSkpXG4gICAgfSBlbHNlIGlmIChtYXRjaGVzW2ldWzNdID09PSB1bmRlZmluZWQgJiYgIW9wdGlvbnMuYWxsb3dCb29sZWFuQXR0cmlidXRlcykge1xuICAgICAgLy9pbmRlcGVuZGVudCBhdHRyaWJ1dGU6IGFiXG4gICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRBdHRyJywgXCJib29sZWFuIGF0dHJpYnV0ZSAnXCIrbWF0Y2hlc1tpXVsyXStcIicgaXMgbm90IGFsbG93ZWQuXCIsIGdldFBvc2l0aW9uRnJvbU1hdGNoKGF0dHJTdHIsIG1hdGNoZXNbaV1bMF0pKTtcbiAgICB9XG4gICAgLyogZWxzZSBpZihtYXRjaGVzW2ldWzZdID09PSB1bmRlZmluZWQpey8vYXR0cmlidXRlIHdpdGhvdXQgdmFsdWU6IGFiPVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBlcnI6IHsgY29kZTpcIkludmFsaWRBdHRyXCIsbXNnOlwiYXR0cmlidXRlIFwiICsgbWF0Y2hlc1tpXVsyXSArIFwiIGhhcyBubyB2YWx1ZSBhc3NpZ25lZC5cIn19O1xuICAgICAgICAgICAgICAgIH0gKi9cbiAgICBjb25zdCBhdHRyTmFtZSA9IG1hdGNoZXNbaV1bMl07XG4gICAgaWYgKCF2YWxpZGF0ZUF0dHJOYW1lKGF0dHJOYW1lKSkge1xuICAgICAgcmV0dXJuIGdldEVycm9yT2JqZWN0KCdJbnZhbGlkQXR0cicsIFwiQXR0cmlidXRlICdcIithdHRyTmFtZStcIicgaXMgYW4gaW52YWxpZCBuYW1lLlwiLCBnZXRQb3NpdGlvbkZyb21NYXRjaChhdHRyU3RyLCBtYXRjaGVzW2ldWzBdKSk7XG4gICAgfVxuICAgIGlmICghYXR0ck5hbWVzLmhhc093blByb3BlcnR5KGF0dHJOYW1lKSkge1xuICAgICAgLy9jaGVjayBmb3IgZHVwbGljYXRlIGF0dHJpYnV0ZS5cbiAgICAgIGF0dHJOYW1lc1thdHRyTmFtZV0gPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZ2V0RXJyb3JPYmplY3QoJ0ludmFsaWRBdHRyJywgXCJBdHRyaWJ1dGUgJ1wiK2F0dHJOYW1lK1wiJyBpcyByZXBlYXRlZC5cIiwgZ2V0UG9zaXRpb25Gcm9tTWF0Y2goYXR0clN0ciwgbWF0Y2hlc1tpXVswXSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZU51bWJlckFtcGVyc2FuZCh4bWxEYXRhLCBpKSB7XG4gIGxldCByZSA9IC9cXGQvO1xuICBpZiAoeG1sRGF0YVtpXSA9PT0gJ3gnKSB7XG4gICAgaSsrO1xuICAgIHJlID0gL1tcXGRhLWZBLUZdLztcbiAgfVxuICBmb3IgKDsgaSA8IHhtbERhdGEubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoeG1sRGF0YVtpXSA9PT0gJzsnKVxuICAgICAgcmV0dXJuIGk7XG4gICAgaWYgKCF4bWxEYXRhW2ldLm1hdGNoKHJlKSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVBbXBlcnNhbmQoeG1sRGF0YSwgaSkge1xuICAvLyBodHRwczovL3d3dy53My5vcmcvVFIveG1sLyNkdC1jaGFycmVmXG4gIGkrKztcbiAgaWYgKHhtbERhdGFbaV0gPT09ICc7JylcbiAgICByZXR1cm4gLTE7XG4gIGlmICh4bWxEYXRhW2ldID09PSAnIycpIHtcbiAgICBpKys7XG4gICAgcmV0dXJuIHZhbGlkYXRlTnVtYmVyQW1wZXJzYW5kKHhtbERhdGEsIGkpO1xuICB9XG4gIGxldCBjb3VudCA9IDA7XG4gIGZvciAoOyBpIDwgeG1sRGF0YS5sZW5ndGg7IGkrKywgY291bnQrKykge1xuICAgIGlmICh4bWxEYXRhW2ldLm1hdGNoKC9cXHcvKSAmJiBjb3VudCA8IDIwKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKHhtbERhdGFbaV0gPT09ICc7JylcbiAgICAgIGJyZWFrO1xuICAgIHJldHVybiAtMTtcbiAgfVxuICByZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZ2V0RXJyb3JPYmplY3QoY29kZSwgbWVzc2FnZSwgbGluZU51bWJlcikge1xuICByZXR1cm4ge1xuICAgIGVycjoge1xuICAgICAgY29kZTogY29kZSxcbiAgICAgIG1zZzogbWVzc2FnZSxcbiAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVBdHRyTmFtZShhdHRyTmFtZSkge1xuICByZXR1cm4gdXRpbC5pc05hbWUoYXR0ck5hbWUpO1xufVxuXG4vLyBjb25zdCBzdGFydHNXaXRoWE1MID0gL154bWwvaTtcblxuZnVuY3Rpb24gdmFsaWRhdGVUYWdOYW1lKHRhZ25hbWUpIHtcbiAgcmV0dXJuIHV0aWwuaXNOYW1lKHRhZ25hbWUpIC8qICYmICF0YWduYW1lLm1hdGNoKHN0YXJ0c1dpdGhYTUwpICovO1xufVxuXG4vL3RoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgbGluZSBudW1iZXIgZm9yIHRoZSBjaGFyYWN0ZXIgYXQgdGhlIGdpdmVuIGluZGV4XG5mdW5jdGlvbiBnZXRMaW5lTnVtYmVyRm9yUG9zaXRpb24oeG1sRGF0YSwgaW5kZXgpIHtcbiAgdmFyIGxpbmVzID0geG1sRGF0YS5zdWJzdHJpbmcoMCwgaW5kZXgpLnNwbGl0KC9cXHI/XFxuLyk7XG4gIHJldHVybiBsaW5lcy5sZW5ndGg7XG59XG5cbi8vdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSBwb3NpdGlvbiBvZiB0aGUgbGFzdCBjaGFyYWN0ZXIgb2YgbWF0Y2ggd2l0aGluIGF0dHJTdHJcbmZ1bmN0aW9uIGdldFBvc2l0aW9uRnJvbU1hdGNoKGF0dHJTdHIsIG1hdGNoKSB7XG4gIHJldHVybiBhdHRyU3RyLmluZGV4T2YobWF0Y2gpICsgbWF0Y2gubGVuZ3RoO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhZ25hbWUsIHBhcmVudCwgdmFsKSB7XG4gIHRoaXMudGFnbmFtZSA9IHRhZ25hbWU7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmNoaWxkID0ge307IC8vY2hpbGQgdGFnc1xuICB0aGlzLmF0dHJzTWFwID0ge307IC8vYXR0cmlidXRlcyBtYXBcbiAgdGhpcy52YWwgPSB2YWw7IC8vdGV4dCBvbmx5XG4gIHRoaXMuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuY2hpbGRbY2hpbGQudGFnbmFtZV0pKSB7XG4gICAgICAvL2FscmVhZHkgcHJlc2VudHNcbiAgICAgIHRoaXMuY2hpbGRbY2hpbGQudGFnbmFtZV0ucHVzaChjaGlsZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2hpbGRbY2hpbGQudGFnbmFtZV0gPSBbY2hpbGRdO1xuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbmNvbnN0IGJ1aWxkT3B0aW9ucyA9IHJlcXVpcmUoJy4vdXRpbCcpLmJ1aWxkT3B0aW9ucztcbmNvbnN0IHhtbE5vZGUgPSByZXF1aXJlKCcuL3htbE5vZGUnKTtcbmNvbnN0IHJlZ3ggPVxuICAnPCgoIVxcXFxbQ0RBVEFcXFxcWyhbXFxcXHNcXFxcU10qPykoXV0+KSl8KChOQU1FOik/KE5BTUUpKShbXj5dKik+fCgoXFxcXC8pKE5BTUUpXFxcXHMqPikpKFtePF0qKSdcbiAgLnJlcGxhY2UoL05BTUUvZywgdXRpbC5uYW1lUmVnZXhwKTtcblxuLy9jb25zdCB0YWdzUmVneCA9IG5ldyBSZWdFeHAoXCI8KFxcXFwvP1tcXFxcdzpcXFxcLVxcLl9dKykoW14+XSopPihcXFxccypcIitjZGF0YVJlZ3grXCIpKihbXjxdKyk/XCIsXCJnXCIpO1xuLy9jb25zdCB0YWdzUmVneCA9IG5ldyBSZWdFeHAoXCI8KFxcXFwvPykoKFxcXFx3KjopPyhbXFxcXHc6XFxcXC1cXC5fXSspKShbXj5dKik+KFtePF0qKShcIitjZGF0YVJlZ3grXCIoW148XSopKSooW148XSspP1wiLFwiZ1wiKTtcblxuLy9wb2x5ZmlsbFxuaWYgKCFOdW1iZXIucGFyc2VJbnQgJiYgd2luZG93LnBhcnNlSW50KSB7XG4gIE51bWJlci5wYXJzZUludCA9IHdpbmRvdy5wYXJzZUludDtcbn1cbmlmICghTnVtYmVyLnBhcnNlRmxvYXQgJiYgd2luZG93LnBhcnNlRmxvYXQpIHtcbiAgTnVtYmVyLnBhcnNlRmxvYXQgPSB3aW5kb3cucGFyc2VGbG9hdDtcbn1cblxuY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGF0dHJpYnV0ZU5hbWVQcmVmaXg6ICdAXycsXG4gIGF0dHJOb2RlTmFtZTogZmFsc2UsXG4gIHRleHROb2RlTmFtZTogJyN0ZXh0JyxcbiAgaWdub3JlQXR0cmlidXRlczogdHJ1ZSxcbiAgaWdub3JlTmFtZVNwYWNlOiBmYWxzZSxcbiAgYWxsb3dCb29sZWFuQXR0cmlidXRlczogZmFsc2UsIC8vYSB0YWcgY2FuIGhhdmUgYXR0cmlidXRlcyB3aXRob3V0IGFueSB2YWx1ZVxuICAvL2lnbm9yZVJvb3RFbGVtZW50IDogZmFsc2UsXG4gIHBhcnNlTm9kZVZhbHVlOiB0cnVlLFxuICBwYXJzZUF0dHJpYnV0ZVZhbHVlOiBmYWxzZSxcbiAgYXJyYXlNb2RlOiBmYWxzZSxcbiAgdHJpbVZhbHVlczogdHJ1ZSwgLy9UcmltIHN0cmluZyB2YWx1ZXMgb2YgdGFnIGFuZCBhdHRyaWJ1dGVzXG4gIGNkYXRhVGFnTmFtZTogZmFsc2UsXG4gIGNkYXRhUG9zaXRpb25DaGFyOiAnXFxcXGMnLFxuICB0YWdWYWx1ZVByb2Nlc3NvcjogZnVuY3Rpb24oYSwgdGFnTmFtZSkge1xuICAgIHJldHVybiBhO1xuICB9LFxuICBhdHRyVmFsdWVQcm9jZXNzb3I6IGZ1bmN0aW9uKGEsIGF0dHJOYW1lKSB7XG4gICAgcmV0dXJuIGE7XG4gIH0sXG4gIHN0b3BOb2RlczogW11cbiAgLy9kZWNvZGVTdHJpY3Q6IGZhbHNlLFxufTtcblxuZXhwb3J0cy5kZWZhdWx0T3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXG5jb25zdCBwcm9wcyA9IFtcbiAgJ2F0dHJpYnV0ZU5hbWVQcmVmaXgnLFxuICAnYXR0ck5vZGVOYW1lJyxcbiAgJ3RleHROb2RlTmFtZScsXG4gICdpZ25vcmVBdHRyaWJ1dGVzJyxcbiAgJ2lnbm9yZU5hbWVTcGFjZScsXG4gICdhbGxvd0Jvb2xlYW5BdHRyaWJ1dGVzJyxcbiAgJ3BhcnNlTm9kZVZhbHVlJyxcbiAgJ3BhcnNlQXR0cmlidXRlVmFsdWUnLFxuICAnYXJyYXlNb2RlJyxcbiAgJ3RyaW1WYWx1ZXMnLFxuICAnY2RhdGFUYWdOYW1lJyxcbiAgJ2NkYXRhUG9zaXRpb25DaGFyJyxcbiAgJ3RhZ1ZhbHVlUHJvY2Vzc29yJyxcbiAgJ2F0dHJWYWx1ZVByb2Nlc3NvcicsXG4gICdwYXJzZVRydWVOdW1iZXJPbmx5JyxcbiAgJ3N0b3BOb2Rlcydcbl07XG5leHBvcnRzLnByb3BzID0gcHJvcHM7XG5cbi8qKlxuICogVHJpbSAtPiB2YWx1ZVByb2Nlc3NvciAtPiBwYXJzZSB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWxcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIHByb2Nlc3NUYWdWYWx1ZSh0YWdOYW1lLCB2YWwsIG9wdGlvbnMpIHtcbiAgaWYgKHZhbCkge1xuICAgIGlmIChvcHRpb25zLnRyaW1WYWx1ZXMpIHtcbiAgICAgIHZhbCA9IHZhbC50cmltKCk7XG4gICAgfVxuICAgIHZhbCA9IG9wdGlvbnMudGFnVmFsdWVQcm9jZXNzb3IodmFsLCB0YWdOYW1lKTtcbiAgICB2YWwgPSBwYXJzZVZhbHVlKHZhbCwgb3B0aW9ucy5wYXJzZU5vZGVWYWx1ZSwgb3B0aW9ucy5wYXJzZVRydWVOdW1iZXJPbmx5KTtcbiAgfVxuXG4gIHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVOYW1lU3BhY2UodGFnbmFtZSwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5pZ25vcmVOYW1lU3BhY2UpIHtcbiAgICBjb25zdCB0YWdzID0gdGFnbmFtZS5zcGxpdCgnOicpO1xuICAgIGNvbnN0IHByZWZpeCA9IHRhZ25hbWUuY2hhckF0KDApID09PSAnLycgPyAnLycgOiAnJztcbiAgICBpZiAodGFnc1swXSA9PT0gJ3htbG5zJykge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBpZiAodGFncy5sZW5ndGggPT09IDIpIHtcbiAgICAgIHRhZ25hbWUgPSBwcmVmaXggKyB0YWdzWzFdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFnbmFtZTtcbn1cblxuZnVuY3Rpb24gcGFyc2VWYWx1ZSh2YWwsIHNob3VsZFBhcnNlLCBwYXJzZVRydWVOdW1iZXJPbmx5KSB7XG4gIGlmIChzaG91bGRQYXJzZSAmJiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGxldCBwYXJzZWQ7XG4gICAgaWYgKHZhbC50cmltKCkgPT09ICcnIHx8IGlzTmFOKHZhbCkpIHtcbiAgICAgIHBhcnNlZCA9IHZhbCA9PT0gJ3RydWUnID8gdHJ1ZSA6IHZhbCA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodmFsLmluZGV4T2YoJzB4JykgIT09IC0xKSB7XG4gICAgICAgIC8vc3VwcG9ydCBoZXhhIGRlY2ltYWxcbiAgICAgICAgcGFyc2VkID0gTnVtYmVyLnBhcnNlSW50KHZhbCwgMTYpO1xuICAgICAgfSBlbHNlIGlmICh2YWwuaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICBwYXJzZWQgPSBOdW1iZXIucGFyc2VGbG9hdCh2YWwpO1xuICAgICAgICB2YWwgPSB2YWwucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkID0gTnVtYmVyLnBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgfVxuICAgICAgaWYgKHBhcnNlVHJ1ZU51bWJlck9ubHkpIHtcbiAgICAgICAgcGFyc2VkID0gU3RyaW5nKHBhcnNlZCkgPT09IHZhbCA/IHBhcnNlZCA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlZDtcbiAgfSBlbHNlIHtcbiAgICBpZiAodXRpbC5pc0V4aXN0KHZhbCkpIHtcbiAgICAgIHJldHVybiB2YWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cbn1cblxuLy9UT0RPOiBjaGFuZ2UgcmVnZXggdG8gY2FwdHVyZSBOU1xuLy9jb25zdCBhdHRyc1JlZ3ggPSBuZXcgUmVnRXhwKFwiKFtcXFxcd1xcXFwtXFxcXC5cXFxcOl0rKVxcXFxzKj1cXFxccyooWydcXFwiXSkoKC58XFxuKSo/KVxcXFwyXCIsXCJnbVwiKTtcbmNvbnN0IGF0dHJzUmVneCA9IG5ldyBSZWdFeHAoJyhbXlxcXFxzPV0rKVxcXFxzKig9XFxcXHMqKFtcXCdcIl0pKC4qPylcXFxcMyk/JywgJ2cnKTtcblxuZnVuY3Rpb24gYnVpbGRBdHRyaWJ1dGVzTWFwKGF0dHJTdHIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zLmlnbm9yZUF0dHJpYnV0ZXMgJiYgdHlwZW9mIGF0dHJTdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgYXR0clN0ciA9IGF0dHJTdHIucmVwbGFjZSgvXFxyP1xcbi9nLCAnICcpO1xuICAgIC8vYXR0clN0ciA9IGF0dHJTdHIgfHwgYXR0clN0ci50cmltKCk7XG5cbiAgICBjb25zdCBtYXRjaGVzID0gdXRpbC5nZXRBbGxNYXRjaGVzKGF0dHJTdHIsIGF0dHJzUmVneCk7XG4gICAgY29uc3QgbGVuID0gbWF0Y2hlcy5sZW5ndGg7IC8vZG9uJ3QgbWFrZSBpdCBpbmxpbmVcbiAgICBjb25zdCBhdHRycyA9IHt9O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IGF0dHJOYW1lID0gcmVzb2x2ZU5hbWVTcGFjZShtYXRjaGVzW2ldWzFdLCBvcHRpb25zKTtcbiAgICAgIGlmIChhdHRyTmFtZS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKG1hdGNoZXNbaV1bNF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChvcHRpb25zLnRyaW1WYWx1ZXMpIHtcbiAgICAgICAgICAgIG1hdGNoZXNbaV1bNF0gPSBtYXRjaGVzW2ldWzRdLnRyaW0oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWF0Y2hlc1tpXVs0XSA9IG9wdGlvbnMuYXR0clZhbHVlUHJvY2Vzc29yKG1hdGNoZXNbaV1bNF0sIGF0dHJOYW1lKTtcbiAgICAgICAgICBhdHRyc1tvcHRpb25zLmF0dHJpYnV0ZU5hbWVQcmVmaXggKyBhdHRyTmFtZV0gPSBwYXJzZVZhbHVlKFxuICAgICAgICAgICAgbWF0Y2hlc1tpXVs0XSxcbiAgICAgICAgICAgIG9wdGlvbnMucGFyc2VBdHRyaWJ1dGVWYWx1ZSxcbiAgICAgICAgICAgIG9wdGlvbnMucGFyc2VUcnVlTnVtYmVyT25seVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5hbGxvd0Jvb2xlYW5BdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgYXR0cnNbb3B0aW9ucy5hdHRyaWJ1dGVOYW1lUHJlZml4ICsgYXR0ck5hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIU9iamVjdC5rZXlzKGF0dHJzKS5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuYXR0ck5vZGVOYW1lKSB7XG4gICAgICBjb25zdCBhdHRyQ29sbGVjdGlvbiA9IHt9O1xuICAgICAgYXR0ckNvbGxlY3Rpb25bb3B0aW9ucy5hdHRyTm9kZU5hbWVdID0gYXR0cnM7XG4gICAgICByZXR1cm4gYXR0ckNvbGxlY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBhdHRycztcbiAgfVxufVxuXG5jb25zdCBnZXRUcmF2ZXJzYWxPYmogPSBmdW5jdGlvbih4bWxEYXRhLCBvcHRpb25zKSB7XG4gIHhtbERhdGEgPSB4bWxEYXRhLnJlcGxhY2UoL1xcclxcbj8vZywgXCJcXG5cIik7XG4gIG9wdGlvbnMgPSBidWlsZE9wdGlvbnMob3B0aW9ucywgZGVmYXVsdE9wdGlvbnMsIHByb3BzKTtcbiAgY29uc3QgeG1sT2JqID0gbmV3IHhtbE5vZGUoJyF4bWwnKTtcbiAgbGV0IGN1cnJlbnROb2RlID0geG1sT2JqO1xuICBsZXQgdGV4dERhdGEgPSBcIlwiO1xuXG4vL2Z1bmN0aW9uIG1hdGNoKHhtbERhdGEpe1xuICBmb3IobGV0IGk9MDsgaTwgeG1sRGF0YS5sZW5ndGg7IGkrKyl7XG4gICAgY29uc3QgY2ggPSB4bWxEYXRhW2ldO1xuICAgIGlmKGNoID09PSAnPCcpe1xuICAgICAgaWYoIHhtbERhdGFbaSsxXSA9PT0gJy8nKSB7Ly9DbG9zaW5nIFRhZ1xuICAgICAgICBjb25zdCBjbG9zZUluZGV4ID0gZmluZENsb3NpbmdJbmRleCh4bWxEYXRhLCBcIj5cIiwgaSwgXCJDbG9zaW5nIFRhZyBpcyBub3QgY2xvc2VkLlwiKVxuICAgICAgICBsZXQgdGFnTmFtZSA9IHhtbERhdGEuc3Vic3RyaW5nKGkrMixjbG9zZUluZGV4KS50cmltKCk7XG5cbiAgICAgICAgaWYob3B0aW9ucy5pZ25vcmVOYW1lU3BhY2Upe1xuICAgICAgICAgIGNvbnN0IGNvbG9uSW5kZXggPSB0YWdOYW1lLmluZGV4T2YoXCI6XCIpO1xuICAgICAgICAgIGlmKGNvbG9uSW5kZXggIT09IC0xKXtcbiAgICAgICAgICAgIHRhZ05hbWUgPSB0YWdOYW1lLnN1YnN0cihjb2xvbkluZGV4KzEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGlmIChjdXJyZW50Tm9kZS5wYXJlbnQpIHtcbiAgICAgICAgICBjdXJyZW50Tm9kZS5wYXJlbnQudmFsID0gdXRpbC5nZXRWYWx1ZShjdXJyZW50Tm9kZS5wYXJlbnQudmFsKSArICcnICsgcHJvY2Vzc1RhZ1ZhbHVlMih0YWdOYW1lLCB0ZXh0RGF0YSAsIG9wdGlvbnMpO1xuICAgICAgICB9ICovXG4gICAgICAgIGlmKGN1cnJlbnROb2RlKXtcbiAgICAgICAgICBpZihjdXJyZW50Tm9kZS52YWwpe1xuICAgICAgICAgICAgY3VycmVudE5vZGUudmFsID0gdXRpbC5nZXRWYWx1ZShjdXJyZW50Tm9kZS52YWwpICsgJycgKyBwcm9jZXNzVGFnVmFsdWUodGFnTmFtZSwgdGV4dERhdGEgLCBvcHRpb25zKTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLnZhbCA9IHByb2Nlc3NUYWdWYWx1ZSh0YWdOYW1lLCB0ZXh0RGF0YSAsIG9wdGlvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnN0b3BOb2Rlcy5sZW5ndGggJiYgb3B0aW9ucy5zdG9wTm9kZXMuaW5jbHVkZXMoY3VycmVudE5vZGUudGFnbmFtZSkpIHtcbiAgICAgICAgICBjdXJyZW50Tm9kZS5jaGlsZCA9IFtdXG4gICAgICAgICAgaWYgKGN1cnJlbnROb2RlLmF0dHJzTWFwID09IHVuZGVmaW5lZCkgeyBjdXJyZW50Tm9kZS5hdHRyc01hcCA9IHt9fVxuICAgICAgICAgIGN1cnJlbnROb2RlLnZhbCA9IHhtbERhdGEuc3Vic3RyKGN1cnJlbnROb2RlLnN0YXJ0SW5kZXggKyAxLCBpIC0gY3VycmVudE5vZGUuc3RhcnRJbmRleCAtIDEpXG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnQ7XG4gICAgICAgIHRleHREYXRhID0gXCJcIjtcbiAgICAgICAgaSA9IGNsb3NlSW5kZXg7XG4gICAgICB9IGVsc2UgaWYoIHhtbERhdGFbaSsxXSA9PT0gJz8nKSB7XG4gICAgICAgIGkgPSBmaW5kQ2xvc2luZ0luZGV4KHhtbERhdGEsIFwiPz5cIiwgaSwgXCJQaSBUYWcgaXMgbm90IGNsb3NlZC5cIilcbiAgICAgIH0gZWxzZSBpZih4bWxEYXRhLnN1YnN0cihpICsgMSwgMykgPT09ICchLS0nKSB7XG4gICAgICAgIGkgPSBmaW5kQ2xvc2luZ0luZGV4KHhtbERhdGEsIFwiLS0+XCIsIGksIFwiQ29tbWVudCBpcyBub3QgY2xvc2VkLlwiKVxuICAgICAgfSBlbHNlIGlmKCB4bWxEYXRhLnN1YnN0cihpICsgMSwgMikgPT09ICchRCcpIHtcbiAgICAgICAgY29uc3QgY2xvc2VJbmRleCA9IGZpbmRDbG9zaW5nSW5kZXgoeG1sRGF0YSwgXCI+XCIsIGksIFwiRE9DVFlQRSBpcyBub3QgY2xvc2VkLlwiKVxuICAgICAgICBjb25zdCB0YWdFeHAgPSB4bWxEYXRhLnN1YnN0cmluZyhpLCBjbG9zZUluZGV4KTtcbiAgICAgICAgaWYodGFnRXhwLmluZGV4T2YoXCJbXCIpID49IDApe1xuICAgICAgICAgIGkgPSB4bWxEYXRhLmluZGV4T2YoXCJdPlwiLCBpKSArIDE7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGkgPSBjbG9zZUluZGV4O1xuICAgICAgICB9XG4gICAgICB9ZWxzZSBpZih4bWxEYXRhLnN1YnN0cihpICsgMSwgMikgPT09ICchWycpIHtcbiAgICAgICAgY29uc3QgY2xvc2VJbmRleCA9IGZpbmRDbG9zaW5nSW5kZXgoeG1sRGF0YSwgXCJdXT5cIiwgaSwgXCJDREFUQSBpcyBub3QgY2xvc2VkLlwiKSAtIDJcbiAgICAgICAgY29uc3QgdGFnRXhwID0geG1sRGF0YS5zdWJzdHJpbmcoaSArIDksY2xvc2VJbmRleCk7XG5cbiAgICAgICAgLy9jb25zaWRlcmF0aW9uc1xuICAgICAgICAvLzEuIENEQVRBIHdpbGwgYWx3YXlzIGhhdmUgcGFyZW50IG5vZGVcbiAgICAgICAgLy8yLiBBIHRhZyB3aXRoIENEQVRBIGlzIG5vdCBhIGxlYWYgbm9kZSBzbyBpdCdzIHZhbHVlIHdvdWxkIGJlIHN0cmluZyB0eXBlLlxuICAgICAgICBpZih0ZXh0RGF0YSl7XG4gICAgICAgICAgY3VycmVudE5vZGUudmFsID0gdXRpbC5nZXRWYWx1ZShjdXJyZW50Tm9kZS52YWwpICsgJycgKyBwcm9jZXNzVGFnVmFsdWUoY3VycmVudE5vZGUudGFnbmFtZSwgdGV4dERhdGEgLCBvcHRpb25zKTtcbiAgICAgICAgICB0ZXh0RGF0YSA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5jZGF0YVRhZ05hbWUpIHtcbiAgICAgICAgICAvL2FkZCBjZGF0YSBub2RlXG4gICAgICAgICAgY29uc3QgY2hpbGROb2RlID0gbmV3IHhtbE5vZGUob3B0aW9ucy5jZGF0YVRhZ05hbWUsIGN1cnJlbnROb2RlLCB0YWdFeHApO1xuICAgICAgICAgIGN1cnJlbnROb2RlLmFkZENoaWxkKGNoaWxkTm9kZSk7XG4gICAgICAgICAgLy9mb3IgYmFja3RyYWNraW5nXG4gICAgICAgICAgY3VycmVudE5vZGUudmFsID0gdXRpbC5nZXRWYWx1ZShjdXJyZW50Tm9kZS52YWwpICsgb3B0aW9ucy5jZGF0YVBvc2l0aW9uQ2hhcjtcbiAgICAgICAgICAvL2FkZCByZXN0IHZhbHVlIHRvIHBhcmVudCBub2RlXG4gICAgICAgICAgaWYgKHRhZ0V4cCkge1xuICAgICAgICAgICAgY2hpbGROb2RlLnZhbCA9IHRhZ0V4cDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3VycmVudE5vZGUudmFsID0gKGN1cnJlbnROb2RlLnZhbCB8fCAnJykgKyAodGFnRXhwIHx8ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgPSBjbG9zZUluZGV4ICsgMjtcbiAgICAgIH1lbHNlIHsvL09wZW5pbmcgdGFnXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGNsb3NpbmdJbmRleEZvck9wZW5pbmdUYWcoeG1sRGF0YSwgaSsxKVxuICAgICAgICBsZXQgdGFnRXhwID0gcmVzdWx0LmRhdGE7XG4gICAgICAgIGNvbnN0IGNsb3NlSW5kZXggPSByZXN1bHQuaW5kZXg7XG4gICAgICAgIGNvbnN0IHNlcGFyYXRvckluZGV4ID0gdGFnRXhwLmluZGV4T2YoXCIgXCIpO1xuICAgICAgICBsZXQgdGFnTmFtZSA9IHRhZ0V4cDtcbiAgICAgICAgbGV0IHNob3VsZEJ1aWxkQXR0cmlidXRlc01hcCA9IHRydWU7XG4gICAgICAgIGlmKHNlcGFyYXRvckluZGV4ICE9PSAtMSl7XG4gICAgICAgICAgdGFnTmFtZSA9IHRhZ0V4cC5zdWJzdHIoMCwgc2VwYXJhdG9ySW5kZXgpLnJlcGxhY2UoL1xcc1xccyokLywgJycpO1xuICAgICAgICAgIHRhZ0V4cCA9IHRhZ0V4cC5zdWJzdHIoc2VwYXJhdG9ySW5kZXggKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG9wdGlvbnMuaWdub3JlTmFtZVNwYWNlKXtcbiAgICAgICAgICBjb25zdCBjb2xvbkluZGV4ID0gdGFnTmFtZS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICBpZihjb2xvbkluZGV4ICE9PSAtMSl7XG4gICAgICAgICAgICB0YWdOYW1lID0gdGFnTmFtZS5zdWJzdHIoY29sb25JbmRleCsxKTtcbiAgICAgICAgICAgIHNob3VsZEJ1aWxkQXR0cmlidXRlc01hcCA9IHRhZ05hbWUgIT09IHJlc3VsdC5kYXRhLnN1YnN0cihjb2xvbkluZGV4ICsgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9zYXZlIHRleHQgdG8gcGFyZW50IG5vZGVcbiAgICAgICAgaWYgKGN1cnJlbnROb2RlICYmIHRleHREYXRhKSB7XG4gICAgICAgICAgaWYoY3VycmVudE5vZGUudGFnbmFtZSAhPT0gJyF4bWwnKXtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLnZhbCA9IHV0aWwuZ2V0VmFsdWUoY3VycmVudE5vZGUudmFsKSArICcnICsgcHJvY2Vzc1RhZ1ZhbHVlKCBjdXJyZW50Tm9kZS50YWduYW1lLCB0ZXh0RGF0YSwgb3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYodGFnRXhwLmxlbmd0aCA+IDAgJiYgdGFnRXhwLmxhc3RJbmRleE9mKFwiL1wiKSA9PT0gdGFnRXhwLmxlbmd0aCAtIDEpey8vc2VsZkNsb3NpbmcgdGFnXG5cbiAgICAgICAgICBpZih0YWdOYW1lW3RhZ05hbWUubGVuZ3RoIC0gMV0gPT09IFwiL1wiKXsgLy9yZW1vdmUgdHJhaWxpbmcgJy8nXG4gICAgICAgICAgICB0YWdOYW1lID0gdGFnTmFtZS5zdWJzdHIoMCwgdGFnTmFtZS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIHRhZ0V4cCA9IHRhZ05hbWU7XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0YWdFeHAgPSB0YWdFeHAuc3Vic3RyKDAsIHRhZ0V4cC5sZW5ndGggLSAxKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBjaGlsZE5vZGUgPSBuZXcgeG1sTm9kZSh0YWdOYW1lLCBjdXJyZW50Tm9kZSwgJycpO1xuICAgICAgICAgIGlmKHRhZ05hbWUgIT09IHRhZ0V4cCl7XG4gICAgICAgICAgICBjaGlsZE5vZGUuYXR0cnNNYXAgPSBidWlsZEF0dHJpYnV0ZXNNYXAodGFnRXhwLCBvcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY3VycmVudE5vZGUuYWRkQ2hpbGQoY2hpbGROb2RlKTtcbiAgICAgICAgfWVsc2V7Ly9vcGVuaW5nIHRhZ1xuXG4gICAgICAgICAgY29uc3QgY2hpbGROb2RlID0gbmV3IHhtbE5vZGUoIHRhZ05hbWUsIGN1cnJlbnROb2RlICk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3RvcE5vZGVzLmxlbmd0aCAmJiBvcHRpb25zLnN0b3BOb2Rlcy5pbmNsdWRlcyhjaGlsZE5vZGUudGFnbmFtZSkpIHtcbiAgICAgICAgICAgIGNoaWxkTm9kZS5zdGFydEluZGV4PWNsb3NlSW5kZXg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKHRhZ05hbWUgIT09IHRhZ0V4cCAmJiBzaG91bGRCdWlsZEF0dHJpYnV0ZXNNYXApe1xuICAgICAgICAgICAgY2hpbGROb2RlLmF0dHJzTWFwID0gYnVpbGRBdHRyaWJ1dGVzTWFwKHRhZ0V4cCwgb3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnJlbnROb2RlLmFkZENoaWxkKGNoaWxkTm9kZSk7XG4gICAgICAgICAgY3VycmVudE5vZGUgPSBjaGlsZE5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgdGV4dERhdGEgPSBcIlwiO1xuICAgICAgICBpID0gY2xvc2VJbmRleDtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIHRleHREYXRhICs9IHhtbERhdGFbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiB4bWxPYmo7XG59XG5cbmZ1bmN0aW9uIGNsb3NpbmdJbmRleEZvck9wZW5pbmdUYWcoZGF0YSwgaSl7XG4gIGxldCBhdHRyQm91bmRhcnk7XG4gIGxldCB0YWdFeHAgPSBcIlwiO1xuICBmb3IgKGxldCBpbmRleCA9IGk7IGluZGV4IDwgZGF0YS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICBsZXQgY2ggPSBkYXRhW2luZGV4XTtcbiAgICBpZiAoYXR0ckJvdW5kYXJ5KSB7XG4gICAgICAgIGlmIChjaCA9PT0gYXR0ckJvdW5kYXJ5KSBhdHRyQm91bmRhcnkgPSBcIlwiOy8vcmVzZXRcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXCInIHx8IGNoID09PSBcIidcIikge1xuICAgICAgICBhdHRyQm91bmRhcnkgPSBjaDtcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnPicpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkYXRhOiB0YWdFeHAsXG4gICAgICAgICAgaW5kZXg6IGluZGV4XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXFx0Jykge1xuICAgICAgY2ggPSBcIiBcIlxuICAgIH1cbiAgICB0YWdFeHAgKz0gY2g7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZENsb3NpbmdJbmRleCh4bWxEYXRhLCBzdHIsIGksIGVyck1zZyl7XG4gIGNvbnN0IGNsb3NpbmdJbmRleCA9IHhtbERhdGEuaW5kZXhPZihzdHIsIGkpO1xuICBpZihjbG9zaW5nSW5kZXggPT09IC0xKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyTXNnKVxuICB9ZWxzZXtcbiAgICByZXR1cm4gY2xvc2luZ0luZGV4ICsgc3RyLmxlbmd0aCAtIDE7XG4gIH1cbn1cblxuZXhwb3J0cy5nZXRUcmF2ZXJzYWxPYmogPSBnZXRUcmF2ZXJzYWxPYmo7XG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkNvbnZlcnRlciA9IHZvaWQgMDtcclxuY2xhc3MgQ29udmVydGVyIHtcclxuICAgIGNvbnZlcnRLVjZUb0pzb24oZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IGJ1c3NlcyA9IGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvO1xyXG4gICAgICAgIHJldHVybiBidXNzZXM7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db252ZXJ0ZXIgPSBDb252ZXJ0ZXI7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuRGF0YWJhc2UgPSB2b2lkIDA7XHJcbmNvbnN0IG1vbmdvb3NlXzEgPSByZXF1aXJlKFwibW9uZ29vc2VcIik7XHJcbmNvbnN0IFZlaGljbGVEYXRhXzEgPSByZXF1aXJlKFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiKTtcclxuY2xhc3MgRGF0YWJhc2Uge1xyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIGlmICghRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgICAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcbiAgICAgICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgSW5pdCgpIHtcclxuICAgICAgICBjb25zdCB1cmwgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICAgICAgY29uc3QgbmFtZSA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX05BTUU7XHJcbiAgICAgICAgdGhpcy5tb25nb29zZSA9IG5ldyBtb25nb29zZV8xLk1vbmdvb3NlKCk7XHJcbiAgICAgICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSk7XHJcbiAgICAgICAgaWYgKCF1cmwgJiYgIW5hbWUpXHJcbiAgICAgICAgICAgIHRocm93IChgSW52YWxpZCBVUkwgb3IgbmFtZSBnaXZlbiwgcmVjZWl2ZWQ6IFxcbiBOYW1lOiAke25hbWV9IFxcbiBVUkw6ICR7dXJsfWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApO1xyXG4gICAgICAgIHRoaXMubW9uZ29vc2UuY29ubmVjdChgJHt1cmx9LyR7bmFtZX1gLCB7XHJcbiAgICAgICAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZSxcclxuICAgICAgICAgICAgdXNlVW5pZmllZFRvcG9sb2d5OiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuICAgICAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuRGF0YWJhc2VMaXN0ZW5lcigpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lcigpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZGIub25jZShcIm9wZW5cIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIHRvIGRhdGFiYXNlIGVzdGFibGlzaGVkLlwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmVoaWNsZVNjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgam91cm5leU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlclxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZlaGljbGVNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJWZWhpY2xlUG9zaXRpb25zXCIsIHRoaXMudmVoaWNsZVNjaGVtYSk7XHJcbiAgICAgICAgICAgICAgICByZXMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBHZXRBbGxWZWhpY2xlcyhhcmdzID0ge30pIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZChhcmdzKTtcclxuICAgIH1cclxuICAgIGFzeW5jIEdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA9IGZhbHNlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgVXBkYXRlVmVoaWNsZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgPSBmYWxzZSkge1xyXG4gICAgICAgIGlmICghdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHZlaGljbGVUb1VwZGF0ZSA9IHZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl07XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uQ2hlY2tzICYmIHVwZGF0ZWRWZWhpY2xlRGF0YS5zdGF0dXMgIT09IFZlaGljbGVEYXRhXzEudmVoaWNsZVN0YXRlLk9OUk9VVEUpXHJcbiAgICAgICAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS5wb3NpdGlvbiA9IHZlaGljbGVUb1VwZGF0ZS5wb3NpdGlvbjtcclxuICAgICAgICB1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICAgIH1cclxuICAgIGFzeW5jIEFkZFZlaGljbGUodmVoaWNsZSkge1xyXG4gICAgICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgICAgICAgIC4uLnZlaGljbGVcclxuICAgICAgICB9KS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB2ZWhpY2xlOiAke3ZlaGljbGUudmVoaWNsZU51bWJlcn0uIEVycm9yOiAke2Vycm9yfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgUmVtb3ZlVmVoaWNsZSh2ZWhpY2xlKSB7XHJcbiAgICAgICAgaWYgKCF2ZWhpY2xlW1wiX2RvY1wiXSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5EYXRhYmFzZSA9IERhdGFiYXNlO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgQVBQIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pKTtcclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59KTtcclxudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZG90ZW52ID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJkb3RlbnZcIikpO1xyXG5kb3RlbnYuY29uZmlnKCk7XHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFlBUk4gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgaHR0cHMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImh0dHBzXCIpKTtcclxuY29uc3QgZnMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImZzXCIpKTtcclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgQ1VTVE9NIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IGRhdGFiYXNlXzEgPSByZXF1aXJlKFwiLi9kYXRhYmFzZVwiKTtcclxuY29uc3Qgc29ja2V0XzEgPSByZXF1aXJlKFwiLi9zb2NrZXRcIik7XHJcbmNvbnN0IHJlYWx0aW1lXzEgPSByZXF1aXJlKFwiLi9yZWFsdGltZVwiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgU1NMIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgcHJpdmF0ZUtleSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LmtleVwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUvY2VydC5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2EgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS1jYS5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGRiID0gYXdhaXQgZGF0YWJhc2VfMS5EYXRhYmFzZS5nZXRJbnN0YW5jZSgpLkluaXQoKTtcclxuICAgIGNvbnN0IG92ID0gcmVhbHRpbWVfMS5PVkRhdGEuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IGFwcCA9IChtb2R1bGUuZXhwb3J0cyA9IGV4cHJlc3MoKSk7XHJcbiAgICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoe1xyXG4gICAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgICBjZXJ0OiBjZXJ0aWZpY2F0ZSxcclxuICAgICAgICBjYTogY2EsXHJcbiAgICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSxcclxuICAgIH0sIGFwcCk7XHJcbiAgICBuZXcgc29ja2V0XzEuV2Vic29ja2V0KHNlcnZlcik7XHJcbiAgICBhcHAuZ2V0KFwiL1wiLCAocmVxLCByZXMpID0+IHJlcy5zZW5kKFwiVGhpcyBpcyB0aGUgQVBJIGVuZHBvaW50IGZvciB0aGUgVEFJT1ZBIGFwcGxpY2F0aW9uLlwiKSk7XHJcbiAgICBhcHAuZ2V0KFwiL2J1c3Nlc1wiLCBhc3luYyAocmVxLCByZXMpID0+IHJlcy5zZW5kKGF3YWl0IGRiLkdldEFsbFZlaGljbGVzKCkpKTtcclxuICAgIGFwcC5nZXQoXCIvYnVzc2VzLzpjb21wYW55LzpudW1iZXIvXCIsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICAgIHJlcy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcS5wYXJhbXMpKTtcclxuICAgIH0pO1xyXG4gICAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxufTtcclxuQXBwSW5pdCgpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pKTtcclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59KTtcclxudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5PVkRhdGEgPSB2b2lkIDA7XHJcbmNvbnN0IHpsaWJfMSA9IHJlcXVpcmUoXCJ6bGliXCIpO1xyXG5jb25zdCBjb252ZXJ0ZXJfMSA9IHJlcXVpcmUoXCIuL2NvbnZlcnRlclwiKTtcclxuY29uc3QgeG1sID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJmYXN0LXhtbC1wYXJzZXJcIikpO1xyXG5jb25zdCB6bXEgPSByZXF1aXJlKCd6ZXJvbXEnKTtcclxuY2xhc3MgT1ZEYXRhIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIGlmICghT1ZEYXRhLmluc3RhbmNlKVxyXG4gICAgICAgICAgICBPVkRhdGEuaW5zdGFuY2UgPSBuZXcgT1ZEYXRhKCk7XHJcbiAgICAgICAgcmV0dXJuIE9WRGF0YS5pbnN0YW5jZTtcclxuICAgIH1cclxuICAgIEluaXQoKSB7XHJcbiAgICAgICAgY29uc3QgY29udmVydGVyID0gbmV3IGNvbnZlcnRlcl8xLkNvbnZlcnRlcigpO1xyXG4gICAgICAgIHRoaXMuc29jayA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLmNvbm5lY3QoXCJ0Y3A6Ly9wdWJzdWIubmRvdmxva2V0Lm5sOjc2NThcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9BUlIvS1Y2cG9zaW5mb1wiKTtcclxuICAgICAgICB0aGlzLnNvY2sub24oXCJtZXNzYWdlXCIsIChvcENvZGUsIC4uLmNvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cob3BDb2RlLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgICAgICAgIHpsaWJfMS5ndW56aXAoY29udGVudHMsIChlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byB1bnppcC4gJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuY29kZWRYTUwgPSBidWZmZXIudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UoZW5jb2RlZFhNTCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb252ZXJ0ZXIuY29udmVydEtWNlRvSnNvbihkZWNvZGVkKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgY29udmVydFRvVmVoaWNsZURhdGEoanNvbikge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuT1ZEYXRhID0gT1ZEYXRhO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLldlYnNvY2tldCA9IHZvaWQgMDtcclxuY2xhc3MgV2Vic29ja2V0IHtcclxuICAgIGNvbnN0cnVjdG9yKHNlcnZlcikge1xyXG4gICAgICAgIHRoaXMuU29ja2V0SW5pdChzZXJ2ZXIpO1xyXG4gICAgfVxyXG4gICAgU29ja2V0SW5pdChzZXJ2ZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YCk7XHJcbiAgICAgICAgdGhpcy5pbyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIikoc2VydmVyLCB7XHJcbiAgICAgICAgICAgIGNvcnM6IHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiBbXCJHRVRcIiwgXCJQT1NUXCJdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuU29ja2V0KHNvY2tldCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBTb2NrZXQoc29ja2V0KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJOZXcgY2xpZW50IGNvbm5lY3RlZC5cIik7XHJcbiAgICAgICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLldlYnNvY2tldCA9IFdlYnNvY2tldDtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy52ZWhpY2xlU3RhdGUgPSB2b2lkIDA7XHJcbnZhciB2ZWhpY2xlU3RhdGU7XHJcbihmdW5jdGlvbiAodmVoaWNsZVN0YXRlKSB7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJPTlJPVVRFXCJdID0gXCJPTlJPVVRFXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJFTkRFRFwiXSA9IFwiRU5ERURcIjtcclxuICAgIHZlaGljbGVTdGF0ZVtcIkRFUEFSVFVSRVwiXSA9IFwiREVQQVJUVVJFXCI7XHJcbn0pKHZlaGljbGVTdGF0ZSA9IGV4cG9ydHMudmVoaWNsZVN0YXRlIHx8IChleHBvcnRzLnZlaGljbGVTdGF0ZSA9IHt9KSk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic29ja2V0LmlvXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6ZXJvbXFcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==