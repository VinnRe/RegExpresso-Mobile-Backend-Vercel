const TOKEN_TYPE = {
  LBRACK: '(',
  RBRACK: ')',
  STAR: '*',
  PLUS: '+',
  OR: '|',
  ALTER: '?',
  END: 'EOF',
  EMPTY: 'ε',
  BLANK: ' ',
  ESCAPE: '\\',
  EXTEND: '\\d\\w',
  UNKNOWN: 'unknown',
  REGCHAR: 'a-zA-Z0-9_ \n\t\r',
};

// Utility function to check if a character is a regular expression character
function isRegChar(char) {
  return /^[a-zA-Z0-9_ ]$/.test(char);
}

// Token class
class Token {
  constructor(type, text) {
    this.type = type;
    this.text = text;
  }
}

const EMPTYTOKEN = new Token(TOKEN_TYPE.EMPTY, 'ε');

// Lexer class
class Lexer {
  constructor(regString) {
    this.regString = regString || '';
    this.index = 0;
  }

  // Check if there are more tokens to parse
  hasNext() {
    return this.index < this.regString.length;
  }

  // Retrieve the next token
  nextToken() {
    while (this.hasNext()) {
      const currentChar = this.regString[this.index];

      switch (currentChar) {
        case '\\':
          this._consume();
          return this._handleEscapeSequence();
        case '(':
          return this._consumeAndReturn(TOKEN_TYPE.LBRACK, '(');
        case ')':
          return this._consumeAndReturn(TOKEN_TYPE.RBRACK, ')');
        case '+':
          return this._consumeAndReturn(TOKEN_TYPE.PLUS, '+');
        case '*':
          return this._consumeAndReturn(TOKEN_TYPE.STAR, '*');
        case '?':
          return this._consumeAndReturn(TOKEN_TYPE.ALTER, '?');
        case '|':
          return this._consumeAndReturn(TOKEN_TYPE.OR, '|');
        default:
          if (isRegChar(currentChar)) {
            return this._consumeAndReturn(TOKEN_TYPE.REGCHAR, currentChar);
          }
          throw new Error(`Unknown character type: ${currentChar}`);
      }
    }
    return new Token(TOKEN_TYPE.END, 'EOF');
  }

  // Consume the current character and return a token
  _consumeAndReturn(type, text) {
    this._consume();
    return new Token(type, text);
  }

  // Handle escape sequences
  _handleEscapeSequence() {
    if (!this.hasNext()) {
      throw new Error('Expect character after "\\".');
    }

    const escapeChar = this.regString[this.index++];
    const escapeMap = {
      n: '\n',
      t: '\t',
      r: '\r',
      '\\': '\\',
      d: '\\d',
      w: '\\w',
    };

    if (escapeMap[escapeChar] !== undefined) {
      const type = ['d', 'w'].includes(escapeChar) ? TOKEN_TYPE.EXTEND : TOKEN_TYPE.REGCHAR;
      return new Token(type, escapeMap[escapeChar]);
    }

    throw new Error(`Invalid escape sequence: \\${escapeChar}`);
  }

  // Increment the index to consume a character
  _consume() {
    this.index++;
  }
}

module.exports = {
  Lexer,
  EMPTYTOKEN,
  TOKEN_TYPE,
};
