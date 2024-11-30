var DotConverter = require('./dot-converter');
var Lexer = require('./lexer').Lexer;
var EMPTYTOKEN = require('./lexer').EMPTYTOKEN;
var TOKEN_TYPE = require('./lexer').TOKEN_TYPE;

function constructGraph(startState) {
  const nfaGraph = {};
  const queue = [startState];
  const visited = new Set();

  while (queue.length > 0) {
    const state = queue.shift();
    nfaGraph[state.id] = [];

    state.nextStates.forEach(([token, nextState]) => {
      nfaGraph[state.id].push([token.text, nextState.id]);
      if (!visited.has(nextState.id)) {
        visited.add(nextState.id);
        queue.push(nextState);
      }
    });
  }
  return nfaGraph;
}

// NFA State Class
class NFAState {
  constructor(id, isAccept = false) {
    this.id = id;
    this.isAccept = isAccept;
    this.nextStates = [];
  }

  addStates(token, state) {
    this.nextStates.push([token, state]);
  }
}

// NFA Class
class NFA {
  constructor(startState, endState) {
    this.startState = startState;
    this.endState = endState;
  }

  _emptyClosure(nfaStates, nfaGraph) {
    const closure = new Set(nfaStates);
    const stack = [...nfaStates];

    while (stack.length > 0) {
      const stateId = stack.pop();
      nfaGraph[stateId]?.forEach(([label, nextId]) => {
        if (label === TOKEN_TYPE.EMPTY && !closure.has(nextId)) {
          closure.add(nextId);
          stack.push(nextId);
        }
      });
    }
    return Array.from(closure).sort((a, b) => a - b);
  }

  _move(dfaState, letter, id2States, nfaGraph) {
    const result = new Set();
    id2States[dfaState.id].forEach((id) => {
      nfaGraph[id]?.forEach(([label, nextId]) => {
        if (label === letter) result.add(nextId);
      });
    });
    return Array.from(result).sort((a, b) => a - b);
  }

  // Convert NFA to DFA
  toDFA() {
    const nfaGraph = constructGraph(this.startState);
    const alphabet = new Set();

    Object.values(nfaGraph).forEach((transitions) =>
      transitions.forEach(([label]) => {
        if (label !== TOKEN_TYPE.EMPTY) alphabet.add(label);
      })
    );

    const dStates = [];
    const states2Id = {};
    const id2States = {};
    let id = 0;

    const closure = this._emptyClosure([this.startState.id], nfaGraph);
    states2Id[JSON.stringify(closure)] = id;
    id2States[id] = closure;
    dStates.push({ id: id++, nextStates: {}, vis: false, accept: closure.includes(this.endState.id) });

    while (dStates.some((state) => !state.vis)) {
      const unvisitedState = dStates.find((state) => !state.vis);
      unvisitedState.vis = true;

      alphabet.forEach((letter) => {
        const nextStates = this._emptyClosure(this._move(unvisitedState, letter, id2States, nfaGraph), nfaGraph);
        if (nextStates.length > 0) {
          const nextStatesString = JSON.stringify(nextStates);
          if (!states2Id[nextStatesString]) {
            states2Id[nextStatesString] = id;
            id2States[id] = nextStates;
            dStates.push({ id: id++, nextStates: {}, vis: false, accept: nextStates.includes(this.endState.id) });
          }
          unvisitedState.nextStates[letter] = nextStates;
        }
      });
    }

    return this._buildDFA(dStates, states2Id);
  }

  _buildDFA(dStates, states2Id) {
    const dfa = new FSM();
    dfa.type = "DFA";
    dfa.numOfStates = dStates.length;

    dStates.forEach((state) => {
      if (state.accept) dfa.acceptStates.push(state.id.toString());
      if (!dfa.transitions[state.id]) dfa.transitions[state.id] = {};

      for (const [letter, nextStates] of Object.entries(state.nextStates)) {
        const nextId = states2Id[JSON.stringify(nextStates)];
        dfa.transitions[state.id][nextId] = letter;
      }
    });

    const initialState = dStates.find((state) => state.nextStates && state.vis);
    if (initialState) dfa.initialState = initialState.id.toString();

    return dfa;
  }

}

//RegParser
class RegParser {
  constructor(regString) {
    this.nfa = null;
    this.id = 0;
    this.lexer = new Lexer(regString);
    this.lookHead = this.lexer.nextToken();
  }

  clear() {
    this.nfa = null;
    this.id = 0;
    this.lexer = null;
    this.lookHead = null;
  }

  reset(regString) {
    this.nfa = null;
    this.id = 0;
    this.lexer = new Lexer(regString);
    this.lookHead = this.lexer.nextToken();
  }

  parseToNFA() {
    this.nfa = this._expression();
    this._reorderNFAStateId();
    return this._traversalFSM();
  }

  parseToDFA() {
    const fsm = this.parseToNFA();
    return this.nfa.toDFA();
  }

  _traversalFSM() {
    const fsm = new FSM();
    const queue = [this.nfa.startState];
    const visited = new Set();

    fsm.initialState = this.nfa.startState.id.toString();
    fsm.numOfStates = this.id;
    fsm.type = 'NFA';
    visited.add(this.nfa.startState.id);

    while (queue.length > 0) {
      const state = queue.shift();
      state.nextStates.forEach(([label, nextState]) => {
        if (!fsm.transitions[state.id]) {
          fsm.transitions[state.id] = {};
        }
        fsm.transitions[state.id][nextState.id] = label.text;

        if (!visited.has(nextState.id)) {
          visited.add(nextState.id);
          if (nextState.isAccept) {
            fsm.acceptStates.push(nextState.id.toString());
          }
          queue.push(nextState);
        }
      });
    }

    return fsm;
  }

  _reorderNFAStateId() {
    const queue = [this.nfa.startState];
    const ordered = [];
    const visited = new Set();

    this.id = 0;
    visited.add(this.nfa.startState.id);

    while (queue.length > 0) {
      const state = queue.shift();
      ordered.push(state);

      state.nextStates.forEach(([, nextState]) => {
        if (!visited.has(nextState.id)) {
          visited.add(nextState.id);
          queue.push(nextState);
        }
      });
    }

    ordered.forEach((state) => {
      state.id = this.id++;
    });
  }

  _expression() {
    let expressionNFA = this._expressionWithoutOr();
    if (this.lookHead.type === TOKEN_TYPE.OR) {
      this._match(TOKEN_TYPE.OR);
      expressionNFA = CombineNFAsForOR(expressionNFA, this._expression(), this);
    }
    return expressionNFA;
  }

  _expressionWithoutOr() {
    const factorNFA = this._factor();
    if (
      [TOKEN_TYPE.REGCHAR, TOKEN_TYPE.EXTEND, TOKEN_TYPE.LBRACK].includes(
        this.lookHead.type
      )
    ) {
      const subNFA = this._expressionWithoutOr();
      factorNFA.endState.isAccept = false;
      factorNFA.endState.id = subNFA.startState.id;
      factorNFA.endState.nextStates = subNFA.startState.nextStates;
      subNFA.startState = null;

      return new NFA(factorNFA.startState, subNFA.endState);
    }
    return factorNFA;
  }

  _factor() {
    const termNFA = this._term();

    if (this.lookHead.type === TOKEN_TYPE.PLUS) {
      const nfa = new NFA(
        new NFAState(this.id++, false),
        new NFAState(this.id++, true)
      );
      termNFA.endState.isAccept = false;
      nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
      termNFA.endState.addStates(EMPTYTOKEN, termNFA.startState);
      termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
      this._match(TOKEN_TYPE.PLUS);

      return nfa;
    } else if (this.lookHead.type === TOKEN_TYPE.STAR) {
      const nfa = new NFA(
        new NFAState(this.id++, false),
        new NFAState(this.id++, true)
      );
      termNFA.endState.isAccept = false;

      nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
      nfa.startState.addStates(EMPTYTOKEN, nfa.endState);
      termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
      termNFA.endState.addStates(EMPTYTOKEN, termNFA.startState);

      this._match(TOKEN_TYPE.STAR);
      return nfa;
    } else if (this.lookHead.type === TOKEN_TYPE.ALTER) {
      const nfa = new NFA(
        new NFAState(this.id++, false),
        new NFAState(this.id++, true)
      );
      termNFA.endState.isAccept = false;

      nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
      nfa.startState.addStates(EMPTYTOKEN, nfa.endState);
      termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);

      this._match(TOKEN_TYPE.ALTER);
      return nfa;
    } else if (this.lookHead.type === TOKEN_TYPE.Unknown) {
      throw new Error(`Unknown symbol: ${this.lookHead.text}`);
    }

    return termNFA;
  }

  _term() {
    if (this.lookHead.type === TOKEN_TYPE.REGCHAR) {
      const nfa = new NFA(
        new NFAState(this.id++, false),
        new NFAState(this.id++, true)
      );
      nfa.startState.addStates(this.lookHead, nfa.endState);
      this._match(TOKEN_TYPE.REGCHAR);
      return nfa;
    } else if (this.lookHead.type === TOKEN_TYPE.LBRACK) {
      this._match(TOKEN_TYPE.LBRACK);
      const nfa = this._expression();
      this._match(TOKEN_TYPE.RBRACK);
      return nfa;
    } else if (this.lookHead.type === TOKEN_TYPE.EXTEND) {
      if (this.lookHead.text === "\\d") {
        const digitCharArray = Array.from({ length: 10 }, (_, i) => i.toString());
        const nfa = constructCharacterNFA(digitCharArray, this);
        this._match(TOKEN_TYPE.EXTEND);
        return nfa;
      } else if (this.lookHead.text === "\\w") {
        const digitCharArray = Array.from({ length: 10 }, (_, i) => i.toString());
        const lettersArray = Array.from({ length: 26 }, (_, i) =>
          String.fromCharCode(97 + i)
        ).concat(Array.from({ length: 26 }, (_, i) =>
          String.fromCharCode(65 + i)
        ));
        const allCharacters = [...digitCharArray, ...lettersArray, "_"];
        const nfa = constructCharacterNFA(allCharacters, this);
        this._match(TOKEN_TYPE.EXTEND);
        return nfa;
      }
    }
    throw new Error(`Invalid term: ${this.lookHead.text}`);
  }

  _match(type) {
    if (this.lookHead.type === type) {
      this._consume();
    } else {
      throw new Error(`Cannot match type: ${this.lookHead.text}`);
    }
  }

  _consume() {
    this.lookHead = this.lexer.nextToken();
  }
}

function constructCharacterNFA(characters, parser) {
  const nfa = new NFA(
    new NFAState(parser.id++, false),
    new NFAState(parser.id++, true)
  );
  characters.forEach((char) => {
    const subNFA = new NFA(
      new NFAState(parser.id++, false),
      new NFAState(parser.id++, false)
    );
    subNFA.startState.addStates(EMPTYTOKEN, subNFA.endState);
    nfa.startState.addStates({ text: char }, subNFA.startState);
    subNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
  });
  return nfa;
}

// FSM Class
class FSM {
  constructor() {
    this.acceptStates = [];
    this.transitions = {};
  }

  toDotScript() {
    return DotConverter.toDotScript(this);
  }

  match(text) {
    if (this.type === 'NFA') throw new Error("match function doesn't support NFA.");
    let currentState = this.initialState;

    for (const symbol of text) {
      if (!this.transitions[currentState] || !this.transitions[currentState][symbol]) return false;
      currentState = this.transitions[currentState][symbol];
    }
    return this.acceptStates.includes(currentState);
  }
  //toTuples
  to5Tuple() {
    const Q = new Set();
    const Sigma = new Set();
    const Delta = [];

    Object.entries(this.transitions).forEach(([state, transitions]) => {
      Q.add(Number(state));
      Object.entries(transitions).forEach(([nextState, label]) => {
        Delta.push([Number(state), label, Number(nextState)]);
        Q.add(Number(nextState));
        Sigma.add(label);
      });
    });

    return {
      Q: Array.from(Q),
      Sigma: Array.from(Sigma),
      Delta,
      q0: Number(this.initialState),
      F: this.acceptStates.map(Number),
    };
  }
}

module.exports = { RegParser, FSM };