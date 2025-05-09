/* jshint node:true*/
/* jshint esnext:true*/

// ./dictionaries.js
//
// This file contains all the different types of dictionaries, and their associated
// functions.
//
// The dicts object should contain a set of constructors for different dictionaries.
// All constructor objects must have the newDict method, which returns an actual
// dictionary object.
// A dictionary object must have three methods:
// generatePrompt, which returns a randomly chosen prompt
// useWord, which makes the dictionary object register internally somewhere that a word has been used
// checkWord, which returns a boolean indicating whether a word is valid or not
//
// The way the dictionary objects and constructor are used is as thus:
// game.server.js initiates an instance of each of the constructor objects (top level objects in the dicts object)
// Whenever a new game starts, game.room.js calls upon the .newDict() method of its desired dictionary constructor
//
// The actual dictionary objects are discarded and regenerated every round
// So it's important for them to be lightweight

var
    dicts = module.exports = {};


var precomputed = require("./dictionaries/precomputed.json");

// The NormalDict dictionary *constructor*
// Yes this is a constructor for an object that acts as a constructor for another object
dicts.Normal = function (wordList, name) {
    this.wordList = wordList.slice();
    this.wordList.sort();


    this.prompts = precomputed[name].prompts;
};

// newDict method of the NormalDict constructor
dicts.Normal.prototype.newDict = function () {
    return new NormalDict(this);
};

// The actual NormalDict dictionary *object*
var NormalDict = function (parent) {
    // We only use a reference to wordList here
    // because memory usage
    this.wordList = parent.wordList;
    this.prompts = parent.prompts;

    this.usedWords = {};
};

// generatePrompt method of NormalDict
NormalDict.prototype.generatePrompt = function (minLength, maxLength, difficulty) {
    // Choose a random prompt length between 2 and maxLength
    var promptLength = minLength + (Math.random() * (maxLength - minLength + 1) | 0);

    if (difficulty === 2) {
        // hard mode
        // just choose a prompt uniformly out of possible prompts

        return this.prompts[promptLength][Math.random() * this.prompts[promptLength].length | 0];

    }
    else {

        var maxAttempts = 100;

        var prompt = "es";  // fallback value if somehow it doesn't successfully find a prompt after 100 tries

        var chosenWord, chosenIndex;
        for (var attempts = 1; attempts < maxAttempts; attempts++) {
            chosenWord = this.wordList[Math.random() * this.wordList.length | 0];

            if (this.usedWords[chosenWord]) continue;
            if (chosenWord.length < promptLength) continue;

            chosenIndex = Math.random() * Math.max(0, chosenWord.length - promptLength);
            prompt = chosenWord.slice(chosenIndex, chosenIndex + promptLength);

            break;
        }

        return prompt;
    }

};

// useWord method for NormalDict
NormalDict.prototype.useWord = function (word) {
    // We're abusing usedWords to be a hash
    // And so we just set it as 1 because Javascript considers 1 to be a
    // true-y value
    this.usedWords[word] = 1;
};

// checkWord method for NormalDict
NormalDict.prototype.checkWord = function (word) {
    // Return false if the word's already been used
    if (this.usedWords[word]) {
        return false;
    }
    // return true if word is in dictionary, false otherwise
    return binarySearch(this.wordList, word) > -1;
};

// Just a binary search algorithm
var binarySearch = function (array, element, start, end) {
    start = start || 0;
    end = end || array.length - 1;

    var currentIndex;
    var currentElement;

    while (start <= end) {
        currentIndex = (start + end) / 2 | 0;
        currentElement = array[currentIndex];

        if (currentElement < element) {
            start = currentIndex + 1;
        }
        else if (currentElement > element) {
            end = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return -1;
};

// JQXZ dictionary constructor
dicts.JQXZ = function (wordList, name) {
    wordList = wordList.filter(function (i) {
        return i.search(/[jqxz]/) > -1;
    });

    dicts.Normal.call(this, wordList, name);
};

// I don't even think you need this line
dicts.JQXZ.prototype = dicts.Normal.prototype;

// Ness dictionary constructor
dicts.Ness = function (wordList, name) {
    wordList = wordList.filter(function (i) {
        return i.search("ness") > -1;
    });

    dicts.Normal.call(this, wordList, name);
};

dicts.Ness.prototype = dicts.Normal.prototype;

dicts.Unique = function (wordList) {
    this.wordList = wordList.slice();

    var data = require("fs").readFileSync(__dirname + "/dictionaries/uniqueprompts.txt");
    this.prompts = data.toString().split(/\r?\n/g).filter(i => i.length).sort();
};

dicts.Unique.prototype.newDict = function () {
    return new UniqueDict(this);
};

var UniqueDict = function (parent) {
    this.wordList = parent.wordList;
    this.prompts = parent.prompts;

    this.usedPrompts = {};
};

UniqueDict.prototype.generatePrompt = function () {
    var maxAttempts = 100;

    var prompt = "svi";
    for (; maxAttempts >= 0; maxAttempts--) {
        prompt = this.prompts[this.prompts.length * Math.random() | 0];
        if (!this.usedPrompts[prompt]) {
            break;
        }
    }

    this.usedPrompts[prompt] = 1;
    return prompt;
};

UniqueDict.prototype.useWord = function (word) {

};

UniqueDict.prototype.checkWord = function (word) {
    return binarySearch(this.wordList, word) > -1;
};

UniqueDict.prototype.scoreWord = function () {
    return 20;
};

UniqueDict.prototype.scorePrompt = function () {
    return 20;
};

dicts.Single = function (wordList, name) {
    this.wordList = wordList.slice();

    dicts.Normal.call(this, wordList, name);
}

dicts.Single.prototype.newDict = function () {
    return new SingleDict(this);
}

var SingleDict = function (parent) {
    NormalDict.call(this, parent);

    this.setPrompt = null;
}

SingleDict.prototype = Object.create(NormalDict.prototype, {
    generatePrompt: {
        value: function (minLength, maxLength, difficulty) {
            if (this.setPrompt == null) {
                this.setPrompt = NormalDict.prototype.generatePrompt.call(this, minLength, maxLength, difficulty);
            }
            return this.setPrompt;
        },
        enumerable: true,
        configurable: true,
        writable: true,
    },
});
