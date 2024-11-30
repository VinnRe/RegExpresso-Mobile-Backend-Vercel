const mongoose = require('mongoose');

const AutomatonSchema = new mongoose.Schema({
    regEx: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
}, { timestamps: true });

const Automaton = mongoose.model('Automaton', AutomatonSchema);
module.exports = Automaton;
