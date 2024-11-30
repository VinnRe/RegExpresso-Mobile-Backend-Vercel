const DOTSCRIPTHEADER = 'digraph finite_state_machine {rankdir = LR;';
const DOTSCRIPTEND = '}';

function escapeCharacter(token) {
  const escapeMap = {
    ' ': '[space]',
    '\n': '\\n',
    '\t': '\\t',
    '\r': '\\r',
    '\\': '[\\]'
  };
  return escapeMap[token] || token;
}

exports.toDotScript = function (fsm) {
  const generateTransitions = () => {
    let transitionDotScript = '  node [shape = circle, color="#e8cdad"];';
    for (const fromId in fsm.transitions) {
      for (const toId in fsm.transitions[fromId]) {
        const label = escapeCharacter(fsm.transitions[fromId][toId]);
        transitionDotScript += `  ${fromId} -> ${toId} [label="${label}", color="#e8cdad", fontcolor="#e8cdad"];`;
      }
    }
    return transitionDotScript;
  };

  const generateStates = () => {
    let initialStatesDotScript = '';
    let initialStatesStartDotScript = '  node [shape = plaintext];';
    let acceptStatesDotScript = '';

    for (let i = 0; i < fsm.numOfStates; ++i) {
      const stateId = i.toString();
      const isAcceptState = fsm.acceptStates.includes(stateId);
      const isInitialState = fsm.initialState === stateId;

      if (isAcceptState) {
        acceptStatesDotScript += `  node [shape = doublecircle, color="#e8cdad", fontcolor="#e8cdad"]; ${stateId};`;
      }

      if (isInitialState) {
        initialStatesStartDotScript += `  "" -> ${stateId} [label="start", color="#e8cdad", fontcolor="#e8cdad"];`;
        if (!isAcceptState) {
          initialStatesDotScript += `  node [shape = circle, color="#e8cdad", fontcolor="#e8cdad"]; ${stateId};`;
        }
      }
    }

    return { initialStatesDotScript, initialStatesStartDotScript, acceptStatesDotScript };
  };

  const transitions = generateTransitions();
  const { initialStatesDotScript, initialStatesStartDotScript, acceptStatesDotScript } = generateStates();

  
  return `${DOTSCRIPTHEADER}
  ${initialStatesDotScript}
  ${acceptStatesDotScript}
  ${initialStatesStartDotScript}
  ${transitions}
  ${DOTSCRIPTEND}`;
};
