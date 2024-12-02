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
    let transitionDotScript = '  node [shape = circle, style = filled, fillcolor = "#e8cdad", color = "#3d2413", fontcolor = "#3d2413"];';
    for (const fromId in fsm.transitions) {
      for (const toId in fsm.transitions[fromId]) {
        const label = escapeCharacter(fsm.transitions[fromId][toId]);
        transitionDotScript += `  ${fromId} -> ${toId} [label="${label}", color = "#3d2413", fontcolor = "#3d2413"];`;
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
        acceptStatesDotScript += `  node [shape = doublecircle, style = filled, fillcolor = "#e8cdad", color = "#3d2413", fontcolor = "#3d2413"]; ${stateId};`;
      }

      if (isInitialState) {
        initialStatesStartDotScript += `  "" -> ${stateId} [label = "start", color = "#3d2413", fontcolor = "#3d2413"];`;
        if (!isAcceptState) {
          initialStatesDotScript += `  node [shape = circle, style = filled, fillcolor = "#e8cdad", color = "#3d2413", fontcolor = "#3d2413"]; ${stateId};`;
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
