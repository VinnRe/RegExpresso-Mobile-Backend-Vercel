const catchAsync = require('../utils/catchAsync');
const regParser = require('../utils/regparser.js');
const Automaton = require("../models/automatonModel.js");
const Viz = require('viz.js')
const { Module, render } = require('viz.js/full.render.js');


exports.parseNFA = catchAsync(async (req, res) => {
  const {regEx} = req.body;
  if (!regEx) {
    return res.status(400).send('Regular expression is required');
  }
  try{
    const parser = new regParser.RegParser(regEx);
    const fsm = parser.parseToNFA();  
    res.status(200).json({
      success: true,
      fsm,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

exports.parseDFA = catchAsync(async (req, res) => {
  const {regEx} = req.body;
  if (!regEx) {
    return res.status(400).send('Regular expression is required');
  }
  try{
    const parser = new regParser.RegParser(regEx);
    const fsm = parser.parseToDFA();  
    res.status(200).json({
      success: true,
      fsm,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

exports.visualizeNFA = catchAsync(async (req, res)=> {
  const { regEx } = req.body;
  if (!regEx) {
    return res.status(400).send('Regular expression is required');
  }

  try {
    const parser = new regParser.RegParser(regEx);
    const fsm = parser.parseToNFA();
    let dotScript = fsm.toDotScript();
    console.log(dotScript);
    
    return res.json({
      message: 'FSM visualized successfully',
      dotScript: dotScript
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

exports.visualizeDFA = catchAsync(async (req, res)=> {
  const { regEx } = req.body;
  if (!regEx) {
    return res.status(400).send('Regular expression is required');
  }

  try {
    const parser = new regParser.RegParser(regEx);
    const fsm = parser.parseToDFA();
    let dotScript = fsm.toDotScript();
    console.log(dotScript);
    
    return res.json({
      message: 'FSM visualized successfully',
      dotScript: dotScript
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

exports.to5TuplesNFA = catchAsync(async (req, res) => {
  const { regEx } = req.body;

  if (!regEx) {
    return res.status(400).json({ error: 'Regular expression is required' });
  }

  try {
    const parser = new regParser.RegParser(regEx); 
    const fsm = parser.parseToNFA(); 
    const tuples = fsm.to5Tuple(); 

    return res.json({
      message: 'FSM successfully converted to 5-tuple',
      tuples,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

exports.to5TuplesDFA = catchAsync(async (req, res) => {
  const { regEx } = req.body;

  if (!regEx) {
    return res.status(400).json({ error: 'Regular expression is required' });
  }

  try {
    const parser = new regParser.RegParser(regEx); 
    const fsm = parser.parseToDFA(); 
    const tuples = fsm.to5Tuple(); 

    return res.json({
      message: 'FSM successfully converted to 5-tuple',
      tuples,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


exports.saveRegEx = catchAsync(async (req, res) => {
  const { regEx } = req.body;

  if (!regEx) {
      return res.status(400).json({ error: 'Regex is required.' });
  }

  try {
      const automaton = await Automaton.create({
          regEx,
          userId: req.user.id 
      });

      res.status(201).json({
          status: 'success',
          data: {
              automaton
          }
      });
  } catch (error) {
      res.status(500).json({
          status: 'error',
          message: 'Failed to save regex',
          error: error.message
      });
  }
});


exports.deleteRegEx = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
      return res.status(400).json({ error: 'Regex ID is required.' });
  }

  try {
      const automaton = await Automaton.findOne({ _id: id, userId: req.user.id });

      if (!automaton) {
          return res.status(404).json({ error: 'Regex not found or not authorized to delete.' });
      }

      await Automaton.deleteOne({ _id: id });

      res.status(200).json({
          status: 'success',
          message: 'Regex deleted successfully'
      });
  } catch (error) {
      res.status(500).json({
          status: 'error',
          message: 'Failed to delete regex',
          error: error.message
      });
  }
});

exports.fetchAllRegEx = catchAsync(async (req, res) => {
  try {
      const automatons = await Automaton.find({ userId: req.user.id });

      res.status(200).json({
          status: 'success',
          results: automatons.length,
          data: {
              automatons
          }
      });
  } catch (error) {
      res.status(500).json({
          status: 'error',
          message: 'Failed to fetch regex',
          error: error.message
      });
  }
});

exports.sendSvgNFA = catchAsync(async (req, res) => {
  const { regEx } = req.body;
  if (!regEx) {
    return res.status(400).send('Regular expression is required');
  }

  try {
    const parser = new regParser.RegParser(regEx);
    const fsm = parser.parseToNFA();
    const dotScript = fsm.toDotScript();
    console.log(dotScript);

    const viz = new Viz({ Module, render });
    const svgContent = await viz.renderString(dotScript);

    console.log(svgContent);

    return res.json({
      message: 'FSM visualized successfully',
      svg: svgContent,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
});
