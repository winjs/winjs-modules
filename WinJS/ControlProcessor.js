// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/ControlProcessor/_OptionsLexer',[
    'exports',
    '../Core/_Base'
    ], function optionsLexerInit(exports, _Base) {
    "use strict";

    /*

Lexical grammar is defined in ECMA-262-5, section 7.

Lexical productions used in this grammar defined in ECMA-262-5:

Production          Section
--------------------------------
Identifier          7.6
NullLiteral         7.8.1
BooleanLiteral      7.8.2
NumberLiteral       7.8.3
StringLiteral       7.8.4

*/

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _optionsLexer: _Base.Namespace._lazy(function () {

            var tokenType = {
                leftBrace: 1,           // {
                rightBrace: 2,          // }
                leftBracket: 3,         // [
                rightBracket: 4,        // ]
                separator: 5,           // ECMA-262-5, 7.2
                colon: 6,               // :
                semicolon: 7,           // ;
                comma: 8,               // ,
                dot: 9,                 // .
                nullLiteral: 10,        // ECMA-262-5, 7.8.1 (null)
                trueLiteral: 11,        // ECMA-262-5, 7.8.2 (true)
                falseLiteral: 12,       // ECMA-262-5, 7.8.2 (false)
                numberLiteral: 13,      // ECMA-262-5, 7.8.3
                stringLiteral: 14,      // ECMA-262-5, 7.8.4
                identifier: 15,         // ECMA-262-5, 7.6
                reservedWord: 16,
                thisKeyword: 17,
                leftParentheses: 18,    // (
                rightParentheses: 19,   // )
                eof: 20,
                error: 21
            };
            // debugging - this costs something like 20%
            //
            //Object.keys(tokenType).forEach(function (key) {
            //    tokenType[key] = key.toString();
            //});
            var tokens = {
                leftBrace: { type: tokenType.leftBrace, length: 1 },
                rightBrace: { type: tokenType.rightBrace, length: 1 },
                leftBracket: { type: tokenType.leftBracket, length: 1 },
                rightBracket: { type: tokenType.rightBracket, length: 1 },
                colon: { type: tokenType.colon, length: 1 },
                semicolon: { type: tokenType.semicolon, length: 1 },
                comma: { type: tokenType.comma, length: 1 },
                dot: { type: tokenType.dot, length: 1 },
                nullLiteral: { type: tokenType.nullLiteral, length: 4, value: null, keyword: true },
                trueLiteral: { type: tokenType.trueLiteral, length: 4, value: true, keyword: true },
                falseLiteral: { type: tokenType.falseLiteral, length: 5, value: false, keyword: true },
                thisKeyword: { type: tokenType.thisKeyword, length: 4, value: "this", keyword: true },
                leftParentheses: { type: tokenType.leftParentheses, length: 1 },
                rightParentheses: { type: tokenType.rightParentheses, length: 1 },
                eof: { type: tokenType.eof, length: 0 }
            };

            function reservedWord(word) {
                return { type: tokenType.reservedWord, value: word, length: word.length, keyword: true };
            }
            function reservedWordLookup(identifier) {
                // Moving from a simple object literal lookup for reserved words to this
                // switch was worth a non-trivial performance increase (5-7%) as this path
                // gets taken for any identifier.
                //
                switch (identifier.charCodeAt(0)) {
                    case /*b*/98:
                        switch (identifier) {
                            case 'break':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*c*/99:
                        switch (identifier) {
                            case 'case':
                            case 'catch':
                            case 'class':
                            case 'const':
                            case 'continue':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*d*/100:
                        switch (identifier) {
                            case 'debugger':
                            case 'default':
                            case 'delete':
                            case 'do':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*e*/101:
                        switch (identifier) {
                            case 'else':
                            case 'enum':
                            case 'export':
                            case 'extends':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*f*/102:
                        switch (identifier) {
                            case 'false':
                                return tokens.falseLiteral;

                            case 'finally':
                            case 'for':
                            case 'function':
                                return reservedWord(identifier);
                        }

                        break;
                    case /*i*/105:
                        switch (identifier) {
                            case 'if':
                            case 'import':
                            case 'in':
                            case 'instanceof':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*n*/110:
                        switch (identifier) {
                            case 'null':
                                return tokens.nullLiteral;

                            case 'new':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*r*/114:
                        switch (identifier) {
                            case 'return':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*s*/115:
                        switch (identifier) {
                            case 'super':
                            case 'switch':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*t*/116:
                        switch (identifier) {
                            case 'true':
                                return tokens.trueLiteral;

                            case 'this':
                                return tokens.thisKeyword;

                            case 'throw':
                            case 'try':
                            case 'typeof':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*v*/118:
                        switch (identifier) {
                            case 'var':
                            case 'void':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*w*/119:
                        switch (identifier) {
                            case 'while':
                            case 'with':
                                return reservedWord(identifier);
                        }
                        break;
                }
                return;
            }

            var lexer = (function () {
                function isIdentifierStartCharacter(code, text, offset, limit) {
                    // The ES5 spec decalares that identifiers consist of a bunch of unicode classes, without
                    // WinRT support for determining unicode class membership we are looking at 2500+ lines of
                    // javascript code to encode the relevant class tables. Instead we look for everything
                    // which is legal and < 0x7f, we exclude whitespace and line terminators, and then accept
                    // everything > 0x7f.
                    //
                    // Here's the ES5 production:
                    //
                    //  Lu | Ll | Lt | Lm | Lo | Nl
                    //  $
                    //  _
                    //  \ UnicodeEscapeSequence
                    //
                    switch (code) {
                        case (code >= /*a*/97 && code <= /*z*/122) && code:
                        case (code >= /*A*/65 && code <= /*Z*/90) && code:
                        case /*$*/36:
                        case /*_*/95:
                            return true;

                        case isWhitespace(code) && code:
                        case isLineTerminator(code) && code:
                            return false;

                        case (code > 0x7f) && code:
                            return true;

                        case /*\*/92:
                            if (offset + 4 < limit) {
                                if (text.charCodeAt(offset) === /*u*/117 &&
                                    isHexDigit(text.charCodeAt(offset + 1)) &&
                                    isHexDigit(text.charCodeAt(offset + 2)) &&
                                    isHexDigit(text.charCodeAt(offset + 3)) &&
                                    isHexDigit(text.charCodeAt(offset + 4))) {
                                    return true;
                                }
                            }
                            return false;

                        default:
                            return false;
                    }
                }
                /*
        // Hand-inlined into readIdentifierPart
        function isIdentifierPartCharacter(code) {
        // See comment in isIdentifierStartCharacter.
        //
        // Mn | Mc | Nd | Pc
        // <ZWNJ> | <ZWJ>
        //
        switch (code) {
        case isIdentifierStartCharacter(code) && code:
        case isDecimalDigit(code) && code:
        return true;

        default:
        return false;
        }
        }
        */
                function readIdentifierPart(text, offset, limit) {
                    var hasEscape = false;
                    while (offset < limit) {
                        var code = text.charCodeAt(offset);
                        switch (code) {
                            //case isIdentifierStartCharacter(code) && code:
                            case (code >= /*a*/97 && code <= /*z*/122) && code:
                            case (code >= /*A*/65 && code <= /*Z*/90) && code:
                            case /*$*/36:
                            case /*_*/95:
                                break;

                            case isWhitespace(code) && code:
                            case isLineTerminator(code) && code:
                                return hasEscape ? -offset : offset;

                            case (code > 0x7f) && code:
                                break;

                                //case isDecimalDigit(code) && code:
                            case (code >= /*0*/48 && code <= /*9*/57) && code:
                                break;

                            case /*\*/92:
                                if (offset + 5 < limit) {
                                    if (text.charCodeAt(offset + 1) === /*u*/117 &&
                                        isHexDigit(text.charCodeAt(offset + 2)) &&
                                        isHexDigit(text.charCodeAt(offset + 3)) &&
                                        isHexDigit(text.charCodeAt(offset + 4)) &&
                                        isHexDigit(text.charCodeAt(offset + 5))) {
                                        offset += 5;
                                        hasEscape = true;
                                        break;
                                    }
                                }
                                return hasEscape ? -offset : offset;

                            default:
                                return hasEscape ? -offset : offset;
                        }
                        offset++;
                    }
                    return hasEscape ? -offset : offset;
                }
                function readIdentifierToken(text, offset, limit) {
                    var startOffset = offset;
                    offset = readIdentifierPart(text, offset, limit);
                    var hasEscape = false;
                    if (offset < 0) {
                        offset = -offset;
                        hasEscape = true;
                    }
                    var identifier = text.substr(startOffset, offset - startOffset);
                    if (hasEscape) {
                        identifier = "" + JSON.parse('"' + identifier + '"');
                    }
                    var wordToken = reservedWordLookup(identifier);
                    if (wordToken) {
                        return wordToken;
                    }
                    return {
                        type: tokenType.identifier,
                        length: offset - startOffset,
                        value: identifier
                    };
                }
                function isHexDigit(code) {
                    switch (code) {
                        case (code >= /*0*/48 && code <= /*9*/57) && code:
                        case (code >= /*a*/97 && code <= /*f*/102) && code:
                        case (code >= /*A*/65 && code <= /*F*/70) && code:
                            return true;

                        default:
                            return false;
                    }
                }
                function readHexIntegerLiteral(text, offset, limit) {
                    while (offset < limit && isHexDigit(text.charCodeAt(offset))) {
                        offset++;
                    }
                    return offset;
                }
                function isDecimalDigit(code) {
                    switch (code) {
                        case (code >= /*0*/48 && code <= /*9*/57) && code:
                            return true;

                        default:
                            return false;
                    }
                }
                function readDecimalDigits(text, offset, limit) {
                    while (offset < limit && isDecimalDigit(text.charCodeAt(offset))) {
                        offset++;
                    }
                    return offset;
                }
                function readDecimalLiteral(text, offset, limit) {
                    offset = readDecimalDigits(text, offset, limit);
                    if (offset < limit && text.charCodeAt(offset) === /*.*/46 && offset + 1 < limit && isDecimalDigit(text.charCodeAt(offset + 1))) {
                        offset = readDecimalDigits(text, offset + 2, limit);
                    }
                    if (offset < limit) {
                        var code = text.charCodeAt(offset);
                        if (code === /*e*/101 || code === /*E*/69) {
                            var tempOffset = offset + 1;
                            if (tempOffset < limit) {
                                code = text.charCodeAt(tempOffset);
                                if (code === /*+*/43 || code === /*-*/45) {
                                    tempOffset++;
                                }
                                offset = readDecimalDigits(text, tempOffset, limit);
                            }
                        }
                    }
                    return offset;
                }
                function readDecimalLiteralToken(text, start, offset, limit) {
                    var offset = readDecimalLiteral(text, offset, limit);
                    var length = offset - start;
                    return {
                        type: tokenType.numberLiteral,
                        length: length,
                        value: +text.substr(start, length)
                    };
                }
                function isLineTerminator(code) {
                    switch (code) {
                        case 0x000A:    // line feed
                        case 0x000D:    // carriage return
                        case 0x2028:    // line separator
                        case 0x2029:    // paragraph separator
                            return true;

                        default:
                            return false;
                    }
                }
                function readStringLiteralToken(text, offset, limit) {
                    var startOffset = offset;
                    var quoteCharCode = text.charCodeAt(offset);
                    var hasEscape = false;
                    offset++;
                    while (offset < limit && !isLineTerminator(text.charCodeAt(offset))) {
                        if (offset + 1 < limit && text.charCodeAt(offset) === /*\*/92) {
                            hasEscape = true;

                            switch (text.charCodeAt(offset + 1)) {
                                case quoteCharCode:
                                case 0x005C:    // \
                                case 0x000A:    // line feed
                                case 0x2028:    // line separator
                                case 0x2029:    // paragraph separator
                                    offset += 2;
                                    continue;

                                case 0x000D:    // carriage return
                                    if (offset + 2 < limit && text.charCodeAt(offset + 2) === 0x000A) {
                                        // Skip \r\n
                                        offset += 3;
                                    } else {
                                        offset += 2;
                                    }
                                    continue;
                            }
                        }
                        offset++;
                        if (text.charCodeAt(offset - 1) === quoteCharCode) {
                            break;
                        }
                    }
                    var length = offset - startOffset;
                    // If we don't have a terminating quote go through the escape path.
                    hasEscape = hasEscape || length === 1 || text.charCodeAt(offset - 1) !== quoteCharCode;
                    var stringValue;
                    if (hasEscape) {
                        stringValue = eval(text.substr(startOffset, length)); // jshint ignore:line
                    } else {
                        stringValue = text.substr(startOffset + 1, length - 2);
                    }
                    return {
                        type: tokenType.stringLiteral,
                        length: length,
                        value: stringValue
                    };
                }
                function isWhitespace(code) {
                    switch (code) {
                        case 0x0009:    // tab
                        case 0x000B:    // vertical tab
                        case 0x000C:    // form feed
                        case 0x0020:    // space
                        case 0x00A0:    // no-breaking space
                        case 0xFEFF:    // BOM
                            return true;

                            // There are no category Zs between 0x00A0 and 0x1680.
                            //
                        case (code < 0x1680) && code:
                            return false;

                            // Unicode category Zs
                            //
                        case 0x1680:
                        case 0x180e:
                        case (code >= 0x2000 && code <= 0x200a) && code:
                        case 0x202f:
                        case 0x205f:
                        case 0x3000:
                            return true;

                        default:
                            return false;
                    }
                }
                // Hand-inlined isWhitespace.
                function readWhitespace(text, offset, limit) {
                    while (offset < limit) {
                        var code = text.charCodeAt(offset);
                        switch (code) {
                            case 0x0009:    // tab
                            case 0x000B:    // vertical tab
                            case 0x000C:    // form feed
                            case 0x0020:    // space
                            case 0x00A0:    // no-breaking space
                            case 0xFEFF:    // BOM
                                break;

                                // There are no category Zs between 0x00A0 and 0x1680.
                                //
                            case (code < 0x1680) && code:
                                return offset;

                                // Unicode category Zs
                                //
                            case 0x1680:
                            case 0x180e:
                            case (code >= 0x2000 && code <= 0x200a) && code:
                            case 0x202f:
                            case 0x205f:
                            case 0x3000:
                                break;

                            default:
                                return offset;
                        }
                        offset++;
                    }
                    return offset;
                }
                function lex(result, text, offset, limit) {
                    while (offset < limit) {
                        var startOffset = offset;
                        var code = text.charCodeAt(offset++);
                        var token;
                        switch (code) {
                            case isWhitespace(code) && code:
                            case isLineTerminator(code) && code:
                                offset = readWhitespace(text, offset, limit);
                                token = { type: tokenType.separator, length: offset - startOffset };
                                // don't include whitespace in the token stream.
                                continue;

                            case /*"*/34:
                            case /*'*/39:
                                token = readStringLiteralToken(text, offset - 1, limit);
                                break;

                            case /*(*/40:
                                token = tokens.leftParentheses;
                                break;

                            case /*)*/41:
                                token = tokens.rightParentheses;
                                break;

                            case /*+*/43:
                            case /*-*/45:
                                if (offset < limit) {
                                    var afterSign = text.charCodeAt(offset);
                                    if (afterSign === /*.*/46) {
                                        var signOffset = offset + 1;
                                        if (signOffset < limit && isDecimalDigit(text.charCodeAt(signOffset))) {
                                            token = readDecimalLiteralToken(text, startOffset, signOffset, limit);
                                            break;
                                        }
                                    } else if (isDecimalDigit(afterSign)) {
                                        token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                        break;
                                    }
                                }
                                token = { type: tokenType.error, length: offset - startOffset, value: text.substring(startOffset, offset) };
                                break;

                            case /*,*/44:
                                token = tokens.comma;
                                break;

                            case /*.*/46:
                                token = tokens.dot;
                                if (offset < limit && isDecimalDigit(text.charCodeAt(offset))) {
                                    token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                }
                                break;

                            case /*0*/48:
                                var ch2 = (offset < limit ? text.charCodeAt(offset) : 0);
                                if (ch2 === /*x*/120 || ch2 === /*X*/88) {
                                    var hexOffset = readHexIntegerLiteral(text, offset + 1, limit);
                                    token = {
                                        type: tokenType.numberLiteral,
                                        length: hexOffset - startOffset,
                                        value: +text.substr(startOffset, hexOffset - startOffset)
                                    };
                                } else {
                                    token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                }
                                break;

                            case (code >= /*1*/49 && code <= /*9*/57) && code:
                                token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                break;

                            case /*:*/58:
                                token = tokens.colon;
                                break;

                            case /*;*/59:
                                token = tokens.semicolon;
                                break;

                            case /*[*/91:
                                token = tokens.leftBracket;
                                break;

                            case /*]*/93:
                                token = tokens.rightBracket;
                                break;

                            case /*{*/123:
                                token = tokens.leftBrace;
                                break;

                            case /*}*/125:
                                token = tokens.rightBrace;
                                break;

                            default:
                                if (isIdentifierStartCharacter(code, text, offset, limit)) {
                                    token = readIdentifierToken(text, offset - 1, limit);
                                    break;
                                }
                                token = { type: tokenType.error, length: offset - startOffset, value: text.substring(startOffset, offset) };
                                break;
                        }

                        offset += (token.length - 1);
                        result.push(token);
                    }
                }
                return function (text) {
                    var result = [];
                    lex(result, text, 0, text.length);
                    result.push(tokens.eof);
                    return result;
                };
            })();
            lexer.tokenType = tokenType;
            return lexer;
        })
    });
});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/ControlProcessor/_OptionsParser',[
    'exports',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    './_OptionsLexer'
    ], function optionsParserInit(exports, _Base, _BaseUtils, _ErrorFromName, _Resources, _OptionsLexer) {
    "use strict";

    var strings = {
        get invalidOptionsRecord() { return "Invalid options record: '{0}', expected to be in the format of an object literal. {1}"; },
        get unexpectedTokenExpectedToken() { return "Unexpected token: {0}, expected token: {1}, at offset {2}"; },
        get unexpectedTokenExpectedTokens() { return "Unexpected token: {0}, expected one of: {1}, at offset {2}"; },
        get unexpectedTokenGeneric() { return "Unexpected token: {0}, at offset {1}"; },
    };

    /*
    Notation is described in ECMA-262-5 (ECMAScript Language Specification, 5th edition) section 5.

    Lexical grammar is defined in ECMA-262-5, section 7.

    Lexical productions used in this grammar defined in ECMA-262-5:

        Production          Section
        --------------------------------
        Identifier          7.6
        NullLiteral         7.8.1
        BooleanLiteral      7.8.2
        NumberLiteral       7.8.3
        StringLiteral       7.8.4

    Syntactic grammar for the value of the data-win-options attribute.

        OptionsLiteral:
            ObjectLiteral

        ObjectLiteral:
            { }
            { ObjectProperties }
            { ObjectProperties , }

        ObjectProperties:
            ObjectProperty
            ObjectProperties, ObjectProperty

        ObjectProperty:
            PropertyName : Value

        PropertyName:                       (from ECMA-262-6, 11.1.5)
            StringLiteral
            NumberLiteral
            Identifier

        ArrayLiteral:
            [ ]
            [ Elision ]
            [ ArrayElements ]
            [ ArrayElements , ]
            [ ArrayElements , Elision ]

        ArrayElements:
            Value
            Elision Value
            ArrayElements , Value
            ArrayElements , Elision Value

        Elision:
            ,
            Elision ,

        Value:
            NullLiteral
            NumberLiteral
            BooleanLiteral
            StringLiteral
            ArrayLiteral
            ObjectLiteral
            IdentifierExpression
            ObjectQueryExpression

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

        ObjectQueryExpression:
            Identifier ( StringLiteral )
            Identifier ( StringLiteral ) AccessExpressions


    NOTE: We have factored the above grammar to allow the infrastructure to be used
          by the BindingInterpreter as well. The BaseInterpreter does NOT provide an
          implementation of _evaluateValue(), this is expected to be provided by the
          derived class since right now the two have different grammars for Value

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        Identifier:
            Identifier                      (from ECMA-262-6, 7.6)

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

        Value:
            *** Provided by concrete interpreter ***

*/

    function illegal() {
        throw "Illegal";
    }

    var imports = _Base.Namespace.defineWithParent(null, null, {
        lexer: _Base.Namespace._lazy(function () {
            return _OptionsLexer._optionsLexer;
        }),
        tokenType: _Base.Namespace._lazy(function () {
            return _OptionsLexer._optionsLexer.tokenType;
        }),
    });

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    function tokenTypeName(type) {
        var keys = Object.keys(imports.tokenType);
        for (var i = 0, len = keys.length; i < len; i++) {
            if (type === imports.tokenType[keys[i]]) {
                return keys[i];
            }
        }
        return "<unknown>";
    }

    var local = _Base.Namespace.defineWithParent(null, null, {

        BaseInterpreter: _Base.Namespace._lazy(function () {
            return _Base.Class.define(null, {
                _error: function (message) {
                    throw new _ErrorFromName("WinJS.UI.ParseError", message);
                },
                _currentOffset: function () {
                    var p = this._pos;
                    var offset = 0;
                    for (var i = 0; i < p; i++) {
                        offset += this._tokens[i].length;
                    }
                    return offset;
                },
                _evaluateAccessExpression: function (value) {
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                            this._read();
                            switch (this._current.type) {
                                case imports.tokenType.identifier:
                                case this._current.keyword && this._current.type:
                                    var id = this._current.value;
                                    this._read();
                                    return value[id];

                                default:
                                    this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.reservedWord);
                                    break;
                            }
                            return;

                        case imports.tokenType.leftBracket:
                            this._read();
                            var index = this._evaluateValue();
                            this._read(imports.tokenType.rightBracket);
                            return value[index];

                            // default: is unreachable because all the callers are conditional on
                            // the next token being either a . or {
                            //
                    }
                },
                _evaluateAccessExpressions: function (value) {
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.dot:
                            case imports.tokenType.leftBracket:
                                value = this._evaluateAccessExpression(value);
                                break;

                            default:
                                return value;
                        }
                    }
                },
                _evaluateIdentifier: function (nested, value) {
                    var id = this._readIdentifier();
                    value = nested ? value[id] : this._context[id];
                    return value;
                },
                _evaluateIdentifierExpression: function () {
                    var value = this._evaluateIdentifier(false);

                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            return this._evaluateAccessExpressions(value);
                        default:
                            return value;
                    }
                },
                _initialize: function (tokens, originalSource, context, functionContext) {
                    this._originalSource = originalSource;
                    this._tokens = tokens;
                    this._context = context;
                    this._functionContext = functionContext;
                    this._pos = 0;
                    this._current = this._tokens[0];
                },
                _read: function (expected) {
                    if (expected && this._current.type !== expected) {
                        this._unexpectedToken(expected);
                    }
                    if (this._current !== imports.tokenType.eof) {
                        this._current = this._tokens[++this._pos];
                    }
                },
                _peek: function (expected) {
                    if (expected && this._current.type !== expected) {
                        return;
                    }
                    if (this._current !== imports.tokenType.eof) {
                        return this._tokens[this._pos + 1];
                    }
                },
                _readAccessExpression: function (parts) {
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                            this._read();
                            switch (this._current.type) {
                                case imports.tokenType.identifier:
                                case this._current.keyword && this._current.type:
                                    parts.push(this._current.value);
                                    this._read();
                                    break;

                                default:
                                    this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.reservedWord);
                                    break;
                            }
                            return;

                        case imports.tokenType.leftBracket:
                            this._read();
                            parts.push(this._evaluateValue());
                            this._read(imports.tokenType.rightBracket);
                            return;

                            // default: is unreachable because all the callers are conditional on
                            // the next token being either a . or {
                            //
                    }
                },
                _readAccessExpressions: function (parts) {
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.dot:
                            case imports.tokenType.leftBracket:
                                this._readAccessExpression(parts);
                                break;

                            default:
                                return;
                        }
                    }
                },
                _readIdentifier: function () {
                    var id = this._current.value;
                    this._read(imports.tokenType.identifier);
                    return id;
                },
                _readIdentifierExpression: function () {
                    var parts = [];
                    if (this._peek(imports.tokenType.thisKeyword) && parts.length === 0) {
                        this._read();
                    } else {
                        parts.push(this._readIdentifier());
                    }

                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            this._readAccessExpressions(parts);
                            break;
                    }

                    return parts;
                },
                _unexpectedToken: function (expected) {
                    var unexpected = (this._current.type === imports.tokenType.error ? "'" + this._current.value + "'" : tokenTypeName(this._current.type));
                    if (expected) {
                        if (arguments.length === 1) {
                            expected = tokenTypeName(expected);
                            this._error(_Resources._formatString(strings.unexpectedTokenExpectedToken, unexpected, expected, this._currentOffset()));
                        } else {
                            var names = [];
                            for (var i = 0, len = arguments.length; i < len; i++) {
                                names.push(tokenTypeName(arguments[i]));
                            }
                            expected = names.join(", ");
                            this._error(_Resources._formatString(strings.unexpectedTokenExpectedTokens, unexpected, expected, this._currentOffset()));
                        }
                    } else {
                        this._error(_Resources._formatString(strings.unexpectedTokenGeneric, unexpected, this._currentOffset()));
                    }
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        OptionsInterpreter: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(local.BaseInterpreter, function (tokens, originalSource, context, functionContext) {
                this._initialize(tokens, originalSource, context, functionContext);
            }, {
                _error: function (message) {
                    throw new _ErrorFromName("WinJS.UI.ParseError", _Resources._formatString(strings.invalidOptionsRecord, this._originalSource, message));
                },
                _evaluateArrayLiteral: function () {
                    var a = [];
                    this._read(imports.tokenType.leftBracket);
                    this._readArrayElements(a);
                    this._read(imports.tokenType.rightBracket);
                    return a;
                },
                _evaluateObjectLiteral: function () {
                    var o = {};
                    this._read(imports.tokenType.leftBrace);
                    this._readObjectProperties(o);
                    this._tryReadComma();
                    this._read(imports.tokenType.rightBrace);
                    return o;
                },
                _evaluateOptionsLiteral: function () {
                    var value = this._evaluateValue();
                    if (this._current.type !== imports.tokenType.eof) {
                        this._unexpectedToken(imports.tokenType.eof);
                    }
                    return value;
                },
                _peekValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                        case imports.tokenType.leftBrace:
                        case imports.tokenType.leftBracket:
                        case imports.tokenType.identifier:
                            return true;
                        default:
                            return false;
                    }
                },
                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        case imports.tokenType.leftBrace:
                            return this._evaluateObjectLiteral();

                        case imports.tokenType.leftBracket:
                            return this._evaluateArrayLiteral();

                        case imports.tokenType.identifier:
                            if (this._peek(imports.tokenType.identifier).type === imports.tokenType.leftParentheses) {
                                return requireSupportedForProcessing(this._evaluateObjectQueryExpression());
                            }
                            return requireSupportedForProcessing(this._evaluateIdentifierExpression());

                        default:
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                    }
                },
                _tryReadElement: function (a) {
                    if (this._peekValue()) {
                        a.push(this._evaluateValue());
                        return true;
                    } else {
                        return false;
                    }
                },
                _tryReadComma: function () {
                    if (this._peek(imports.tokenType.comma)) {
                        this._read();
                        return true;
                    }
                    return false;
                },
                _tryReadElision: function (a) {
                    var found = false;
                    while (this._tryReadComma()) {
                        a.push(undefined);
                        found = true;
                    }
                    return found;
                },
                _readArrayElements: function (a) {
                    while (!this._peek(imports.tokenType.rightBracket)) {
                        var elision = this._tryReadElision(a);
                        var element = this._tryReadElement(a);
                        var comma = this._peek(imports.tokenType.comma);
                        if (element && comma) {
                            // if we had a element followed by a comma, eat the comma and try to read the next element
                            this._read();
                        } else if (element || elision) {
                            // if we had a element without a trailing comma or if all we had were commas we're done
                            break;
                        } else {
                            // if we didn't have a element or elision then we are done and in error
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                        }
                    }
                },
                _readObjectProperties: function (o) {
                    while (!this._peek(imports.tokenType.rightBrace)) {
                        var property = this._tryReadObjectProperty(o);
                        var comma = this._peek(imports.tokenType.comma);
                        if (property && comma) {
                            // if we had a property followed by a comma, eat the comma and try to read the next property
                            this._read();
                        } else if (property) {
                            // if we had a property without a trailing comma we're done
                            break;
                        } else {
                            // if we didn't have a property then we are done and in error
                            this._unexpectedToken(imports.tokenType.numberLiteral, imports.tokenType.stringLiteral, imports.tokenType.identifier);
                            break;
                        }
                    }
                },
                _tryReadObjectProperty: function (o) {
                    switch (this._current.type) {
                        case imports.tokenType.numberLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.identifier:
                        case this._current.keyword && this._current.type:
                            var propertyName = this._current.value;
                            this._read();
                            this._read(imports.tokenType.colon);
                            o[propertyName] = this._evaluateValue();
                            return true;

                        default:
                            return false;
                    }
                },
                _failReadObjectProperty: function () {
                    this._unexpectedToken(imports.tokenType.numberLiteral, imports.tokenType.stringLiteral, imports.tokenType.identifier, imports.tokenType.reservedWord);
                },
                _evaluateObjectQueryExpression: function () {
                    var functionName = this._current.value;
                    this._read(imports.tokenType.identifier);
                    this._read(imports.tokenType.leftParentheses);
                    var queryExpression = this._current.value;
                    this._read(imports.tokenType.stringLiteral);
                    this._read(imports.tokenType.rightParentheses);

                    var value = requireSupportedForProcessing(this._functionContext[functionName])(queryExpression);
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            return this._evaluateAccessExpressions(value);

                        default:
                            return value;
                    }
                },
                run: function () {
                    return this._evaluateOptionsLiteral();
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        OptionsParser: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(local.OptionsInterpreter, function (tokens, originalSource) {
                this._initialize(tokens, originalSource);
            }, {
                // When parsing it is illegal to get to any of these "evaluate" RHS productions because
                //  we will always instead go to the "read" version
                //
                _evaluateAccessExpression: illegal,
                _evaluateAccessExpressions: illegal,
                _evaluateIdentifier: illegal,
                _evaluateIdentifierExpression: illegal,
                _evaluateObjectQueryExpression: illegal,

                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        case imports.tokenType.leftBrace:
                            return this._evaluateObjectLiteral();

                        case imports.tokenType.leftBracket:
                            return this._evaluateArrayLiteral();

                        case imports.tokenType.identifier:
                            if (this._peek(imports.tokenType.identifier).type === imports.tokenType.leftParentheses) {
                                return this._readObjectQueryExpression();
                            }
                            return this._readIdentifierExpression();

                        default:
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                    }
                },

                _readIdentifierExpression: function () {
                    var parts = local.BaseInterpreter.prototype._readIdentifierExpression.call(this);
                    return new IdentifierExpression(parts);
                },
                _readObjectQueryExpression: function () {
                    var functionName = this._current.value;
                    this._read(imports.tokenType.identifier);
                    this._read(imports.tokenType.leftParentheses);
                    var queryExpressionLiteral = this._current.value;
                    this._read(imports.tokenType.stringLiteral);
                    this._read(imports.tokenType.rightParentheses);

                    var call = new CallExpression(functionName, queryExpressionLiteral);
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            var parts = [call];
                            this._readAccessExpressions(parts);
                            return new IdentifierExpression(parts);

                        default:
                            return call;
                    }
                },
            }, {
                supportedForProcessing: false,
            });
        })

    });

    var parser = function (text, context, functionContext) {
        var tokens = imports.lexer(text);
        var interpreter = new local.OptionsInterpreter(tokens, text, context || {}, functionContext || {});
        return interpreter.run();
    };
    Object.defineProperty(parser, "_BaseInterpreter", { get: function () { return local.BaseInterpreter; } });

    var parser2 = function (text) {
        var tokens = imports.lexer(text);
        var parser = new local.OptionsParser(tokens, text);
        return parser.run();
    };

    // Consumers of parser2 need to be able to see the AST for RHS expression in order to emit
    //  code representing these portions of the options record
    //
    var CallExpression = _Base.Class.define(function (target, arg0Value) {
        this.target = target;
        this.arg0Value = arg0Value;
    });
    CallExpression.supportedForProcessing = false;

    var IdentifierExpression = _Base.Class.define(function (parts) {
        this.parts = parts;
    });
    IdentifierExpression.supportedForProcessing = false;

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        // This is the mis-named interpreter version of the options record processor.
        //
        optionsParser: parser,

        // This is the actual parser version of the options record processor.
        //
        _optionsParser: parser2,
        _CallExpression: CallExpression,
        _IdentifierExpression: IdentifierExpression,

    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/ControlProcessor',[
    'exports',
    './Core/_Global',
    './Core/_Base',
    './Core/_BaseUtils',
    './Core/_Log',
    './Core/_Resources',
    './Core/_WriteProfilerMark',
    './ControlProcessor/_OptionsParser',
    './Promise',
    './Utilities/_ElementUtilities'
    ], function declarativeControlsInit(exports, _Global, _Base, _BaseUtils, _Log, _Resources, _WriteProfilerMark, _OptionsParser, Promise, _ElementUtilities) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    var strings = {
        get errorActivatingControl() { return "Error activating control: {0}"; },
    };

    var markSupportedForProcessing = _BaseUtils.markSupportedForProcessing;
    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;
    var processedAllCalled = false;

    function createSelect(element) {
        var result = function select(selector) {
            /// <signature helpKeyword="WinJS.UI.select.createSelect">
            /// <summary locid="WinJS.UI.select.createSelect">
            /// Walks the DOM tree from the given  element to the root of the document, whenever
            /// a selector scope is encountered select performs a lookup within that scope for
            /// the given selector string. The first matching element is returned.
            /// </summary>
            /// <param name="selector" type="String" locid="WinJS.UI.select.createSelect_p:selector">The selector string.</param>
            /// <returns type="HTMLElement" domElement="true" locid="WinJS.UI.select.createSelect_returnValue">The target element, if found.</returns>
            /// </signature>
            var current = element;
            var selected;
            while (current) {
                if (current.msParentSelectorScope) {
                    var scope = current.parentNode;
                    if (scope) {
                        selected = _ElementUtilities._matchesSelector(scope, selector) ? scope : scope.querySelector(selector);
                        if (selected) {
                            break;
                        }
                    }
                }
                current = current.parentNode;
            }

            return selected || _Global.document.querySelector(selector);
        };
        return markSupportedForProcessing(result);
    }

    function activate(element, Handler) {
        return new Promise(function activate2(complete, error) {
            try {
                var options;
                var optionsAttribute = element.getAttribute("data-win-options");
                if (optionsAttribute) {
                    options = _OptionsParser.optionsParser(optionsAttribute, _Global, {
                        select: createSelect(element)
                    });
                }

                var ctl;
                var count = 1;

                // handler is required to call complete if it takes that parameter
                //
                if (Handler.length > 2) {
                    count++;
                }
                var checkComplete = function checkComplete() {
                    count--;
                    if (count === 0) {
                        element.winControl = element.winControl || ctl;
                        complete(ctl);
                    }
                };

                // async exceptions from the handler get dropped on the floor...
                //
                ctl = new Handler(element, options, checkComplete);
                checkComplete();
            }
            catch (err) {
                _Log.log && _Log.log(_Resources._formatString(strings.errorActivatingControl, err && err.message), "winjs controls", "error");
                error(err);
            }
        });
    }

    function processAllImpl(rootElement, skipRootElement) {
        return new Promise(function processAllImpl2(complete, error) {
            _WriteProfilerMark("WinJS.UI:processAll,StartTM");
            rootElement = rootElement || _Global.document.body;
            var pending = 0;
            var selector = "[data-win-control]";
            var allElements = rootElement.querySelectorAll(selector);
            var elements = [];
            if (!skipRootElement && getControlHandler(rootElement)) {
                elements.push(rootElement);
            }
            for (var i = 0, len = allElements.length; i < len; i++) {
                elements.push(allElements[i]);
            }

            // bail early if there is nothing to process
            //
            if (elements.length === 0) {
                _WriteProfilerMark("WinJS.UI:processAll,StopTM");
                complete(rootElement);
                return;
            }

            var checkAllComplete = function () {
                pending = pending - 1;
                if (pending < 0) {
                    _WriteProfilerMark("WinJS.UI:processAll,StopTM");
                    complete(rootElement);
                }
            };

            // First go through and determine which elements to activate
            //
            var controls = new Array(elements.length);
            for (var i = 0, len = elements.length; i < len; i++) {
                var element = elements[i];
                var control;
                var instance = element.winControl;
                if (instance) {
                    control = instance.constructor;
                    // already activated, don't need to add to controls array
                } else {
                    controls[i] = control = getControlHandler(element);
                }
                if (control && control.isDeclarativeControlContainer) {
                    i += element.querySelectorAll(selector).length;
                }
            }

            // Now go through and activate those
            //
            _WriteProfilerMark("WinJS.UI:processAllActivateControls,StartTM");
            for (var i = 0, len = elements.length; i < len; i++) {
                var ctl = controls[i];
                var element = elements[i];
                if (ctl && !element.winControl) {
                    pending++;
                    activate(element, ctl).then(checkAllComplete, function (e) {
                        _WriteProfilerMark("WinJS.UI:processAll,StopTM");
                        error(e);
                    });

                    if (ctl.isDeclarativeControlContainer && typeof ctl.isDeclarativeControlContainer === "function") {
                        var idcc = requireSupportedForProcessing(ctl.isDeclarativeControlContainer);
                        idcc(element.winControl, processAll);
                    }
                }
            }
            _WriteProfilerMark("WinJS.UI:processAllActivateControls,StopTM");

            checkAllComplete();
        });
    }

    function getControlHandler(element) {
        if (element.getAttribute) {
            var evaluator = element.getAttribute("data-win-control");
            if (evaluator) {
                return _BaseUtils._getMemberFiltered(evaluator.trim(), _Global, requireSupportedForProcessing);
            }
        }
    }

    function scopedSelect(selector, element) {
        /// <signature helpKeyword="WinJS.UI.scopedSelect">
        /// <summary locid="WinJS.UI.scopedSelect">
        /// Walks the DOM tree from the given  element to the root of the document, whenever
        /// a selector scope is encountered select performs a lookup within that scope for
        /// the given selector string. The first matching element is returned.
        /// </summary>
        /// <param name="selector" type="String" locid="WinJS.UI.scopedSelect_p:selector">The selector string.</param>
        /// <returns type="HTMLElement" domElement="true" locid="WinJS.UI.scopedSelect_returnValue">The target element, if found.</returns>
        /// </signature>
        return createSelect(element)(selector);
    }

    function processAll(rootElement, skipRoot) {
        /// <signature helpKeyword="WinJS.UI.processAll">
        /// <summary locid="WinJS.UI.processAll">
        /// Applies declarative control binding to all elements, starting at the specified root element.
        /// </summary>
        /// <param name="rootElement" type="Object" domElement="true" locid="WinJS.UI.processAll_p:rootElement">
        /// The element at which to start applying the binding. If this parameter is not specified, the binding is applied to the entire document.
        /// </param>
        /// <param name="skipRoot" type="Boolean" optional="true" locid="WinJS.UI.processAll_p:skipRoot">
        /// If true, the elements to be bound skip the specified root element and include only the children.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.processAll_returnValue">
        /// A promise that is fulfilled when binding has been applied to all the controls.
        /// </returns>
        /// </signature>
        if (!processedAllCalled) {
            return _BaseUtils.ready().then(function () {
                processedAllCalled = true;
                return processAllImpl(rootElement, skipRoot);
            });
        } else {
            return processAllImpl(rootElement, skipRoot);
        }
    }

    function process(element) {
        /// <signature helpKeyword="WinJS.UI.process">
        /// <summary locid="WinJS.UI.process">
        /// Applies declarative control binding to the specified element.
        /// </summary>
        /// <param name="element" type="Object" domElement="true" locid="WinJS.UI.process_p:element">
        /// The element to bind.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.process_returnValue">
        /// A promise that is fulfilled after the control is activated. The value of the
        /// promise is the control that is attached to element.
        /// </returns>
        /// </signature>

        if (element && element.winControl) {
            return Promise.as(element.winControl);
        }
        var handler = getControlHandler(element);
        if (!handler) {
            return Promise.as(); // undefined, no handler
        } else {
            return activate(element, handler);
        }
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        scopedSelect: scopedSelect,
        processAll: processAll,
        process: process
    });
});
