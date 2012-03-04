function $(e) { return document.getElementById(e); }
function $$(e) { return document.createElement(e); }

Element.prototype.hasClass=function(a){return this.className.match(new RegExp("(\\s|^)"+a+"(\\s|$)"))};
Element.prototype.addClass=function(a){if(!this.hasClass(a)){this.className+=" "+a}};
Element.prototype.removeClass=function(a){if(this.hasClass(a)){var b=new RegExp("(\\s|^)"+a+"(\\s|$)");this.className=this.className.replace(b," ")}};


//http://www.iconfinder.com/icondetails/7209/128/music_sound_speaker_icon
/***************************************************************\
 * Google helpers
 * Portions Copyright (c) 2010 The Chromium Authors
\****************************************************************/

var gdocs = {};
var util = {};

var DEFAULT_MIMETYPES = {
  'atom': 'application/atom+xml',
  'folder': 'application/atom+xml',
  'document': 'text/plain',
  'spreadsheet': 'text/csv',
  'presentation': 'text/plain',
  'pdf': 'application/pdf'
};

gdocs.GoogleDoc = function(entry) {
	this.entry = entry;
	this.title = entry.title.$t;
	this.resourceId = entry.gd$resourceId.$t;
	this.type = gdocs.getCategory(
	entry.category, 'http://schemas.google.com/g/2005#kind');
	this.starred = gdocs.getCategory(
		entry.category, 'http://schemas.google.com/g/2005/labels',
		'http://schemas.google.com/g/2005/labels#starred') ? true : false;
	this.link = {
		'alternate': gdocs.getLink(entry.link, 'alternate').href
	};
	this.contentSrc = entry.content.src;
};

/**
* Urlencodes a JSON object of key/value query parameters.
* @param {Object} parameters Key value pairs representing URL parameters.
* @return {string} query parameters concatenated together.
*/
util.stringify = function(parameters) {
	var params = [];
	for(var p in parameters) {
		params.push(encodeURIComponent(p) + '=' +
		encodeURIComponent(parameters[p]));
	}
	return params.join('&');
};

/**
* Creates a JSON object of key/value pairs
* @param {string} paramStr A string of Url query parmeters.
*    For example: max-results=5&startindex=2&showfolders=true
* @return {Object} The query parameters as key/value pairs.
*/
util.unstringify = function(paramStr) {
	var parts = paramStr.split('&');

	var params = {};
	for (var i = 0, pair; pair = parts[i]; ++i) {
		var param = pair.split('=');
		params[decodeURIComponent(param[0])] = decodeURIComponent(param[1]);
	}
	return params;
};

/**
* Returns the correct atom link corresponding to the 'rel' value passed in.
* @param {Array<Object>} links A list of atom link objects.
* @param {string} rel The rel value of the link to return. For example: 'next'.
* @return {string|null} The appropriate link for the 'rel' passed in, or null
*     if one is not found.
*/
gdocs.getLink = function(links, rel) {
	for (var i = 0, link; link = links[i]; ++i) {
		if (link.rel === rel) {
			return link;
		}
	}
	return null;
};

/**
* Returns the correct atom category corresponding to the scheme/term passed in.
* @param {Array<Object>} categories A list of atom category objects.
* @param {string} scheme The category's scheme to look up.
* @param {opt_term?} An optional term value for the category to look up.
* @return {string|null} The appropriate category, or null if one is not found.
*/
gdocs.getCategory = function(categories, scheme, opt_term) {
	for (var i = 0, cat; cat = categories[i]; ++i) {
		if (opt_term) {
			if (cat.scheme === scheme && opt_term === cat.term) {
				return cat;
			}
		} else if (cat.scheme === scheme) {
			return cat;
		}
	}
	return null;
};


/**
 * A helper for constructing the raw Atom xml send in the body of an HTTP post.
 * @param {XMLHttpRequest} xhr The xhr request that failed.
 * @param {string} docTitle A title for the document.
 * @param {string} docType The type of document to create.
 *     (eg. 'document', 'spreadsheet', etc.)
 * @param {boolean?} opt_starred Whether the document should be starred.
 * @return {string} The Atom xml as a string.
 */
gdocs.constructAtomXml_ = function(docTitle, docType, opt_starred) {
  var starred = opt_starred || null;

  var starCat = ['<category scheme="http://schemas.google.com/g/2005/labels" ',
                 'term="http://schemas.google.com/g/2005/labels#starred" ',
                 'label="starred"/>'].join('');

  var atom = ["<?xml version='1.0' encoding='UTF-8'?>", 
              '<entry xmlns="http://www.w3.org/2005/Atom">',
              '<category scheme="http://schemas.google.com/g/2005#kind"', 
              ' term="http://schemas.google.com/docs/2007#', docType, '"/>',
              starred ? starCat : '',
              '<title>', docTitle, '</title>',
              '</entry>'].join('');
  return atom;
};

/**
 * A helper for constructing the body of a mime-mutlipart HTTP request.
 * @param {string} title A title for the new document.
 * @param {string} docType The type of document to create.
 *     (eg. 'document', 'spreadsheet', etc.)
 * @param {string} body The body of the HTTP request.
 * @param {string} contentType The Content-Type of the (non-Atom) portion of the
 *     http body.
 * @param {boolean?} opt_starred Whether the document should be starred.
 * @return {string} The Atom xml as a string.
 */
gdocs.constructContentBody_ = function(title, docType, body, contentType,
                                       opt_starred) {
  var body = ['--END_OF_PART\r\n',
              'Content-Type: application/atom+xml;\r\n\r\n',
              gdocs.constructAtomXml_(title, docType, opt_starred), '\r\n',
              '--END_OF_PART\r\n',
              'Content-Type: ', contentType, '\r\n\r\n',
              body, '\r\n',
              '--END_OF_PART--\r\n'].join('');
  return body;
};