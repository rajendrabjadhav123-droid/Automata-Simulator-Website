const ui = new UIController();

// Pre-defined Machines
const machines = {
    dfa: {
        title: "Finite Automata (DFA)",
        desc: "Accepts binary strings with an even number of 0s.",
        type: "DFA",
        machine: new FiniteAutomata(
            ['q0', 'q1'], 
            ['0', '1'], 
            {
                'q0': { '0': 'q1', '1': 'q0' },
                'q1': { '0': 'q0', '1': 'q1' }
            }, 
            'q0', 
            ['q0']
        )
    },
    pda: {
        title: "Pushdown Automata (PDA)",
        desc: "Accepts strings of the form aⁿbⁿ (e.g., aabb).",
        type: "PDA",
        machine: new PushdownAutomata(
            ['q0', 'q1', 'q2'],
            ['a', 'b'],
            ['a', 'Z'],
            {
                'q0': {
                    'a': [ { pop: 'Z', push: ['a', 'Z'], nextState: 'q0' }, { pop: 'a', push: ['a', 'a'], nextState: 'q0' } ],
                    'b': [ { pop: 'a', push: [''], nextState: 'q1' } ]
                },
                'q1': {
                    'b': [ { pop: 'a', push: [''], nextState: 'q1' } ],
                    '': [ { pop: 'Z', push: ['Z'], nextState: 'q2' } ] // epsilon transition to accept state when stack is empty (except Z)
                }
            },
            'q0',
            'Z',
            ['q2']
        )
    },
    tm: {
        title: "Turing Machine (TM)",
        desc: "Accepts strings of the form aⁿbⁿcⁿ (e.g., aabbcc).",
        type: "TM",
        machine: new TuringMachine(
            ['q0', 'q1', 'q2', 'q3', 'q4', 'q_accept', 'q_reject'],
            ['a', 'b', 'c'],
            ['a', 'b', 'c', 'X', 'Y', 'Z', ' '],
            {
                'q0': {
                    'a': { write: 'X', move: 'R', nextState: 'q1' },
                    'Y': { write: 'Y', move: 'R', nextState: 'q4' }
                },
                'q1': {
                    'a': { write: 'a', move: 'R', nextState: 'q1' },
                    'Y': { write: 'Y', move: 'R', nextState: 'q1' },
                    'b': { write: 'Y', move: 'R', nextState: 'q2' }
                },
                'q2': {
                    'b': { write: 'b', move: 'R', nextState: 'q2' },
                    'Z': { write: 'Z', move: 'R', nextState: 'q2' },
                    'c': { write: 'Z', move: 'L', nextState: 'q3' }
                },
                'q3': {
                    'a': { write: 'a', move: 'L', nextState: 'q3' },
                    'b': { write: 'b', move: 'L', nextState: 'q3' },
                    'Y': { write: 'Y', move: 'L', nextState: 'q3' },
                    'Z': { write: 'Z', move: 'L', nextState: 'q3' },
                    'X': { write: 'X', move: 'R', nextState: 'q0' }
                },
                'q4': {
                    'Y': { write: 'Y', move: 'R', nextState: 'q4' },
                    'Z': { write: 'Z', move: 'R', nextState: 'q4' },
                    ' ': { write: ' ', move: 'R', nextState: 'q_accept' }
                }
            },
            'q0',
            'q_accept',
            'q_reject',
            ' '
        )
    }
};

let currentConfig = machines.dfa;
let simulationState = {
    inputString: '',
    currentIndex: 0,
    running: false
};

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const titleEl = document.getElementById('machine-title');
const descEl = document.getElementById('machine-desc');
const inputEl = document.getElementById('input-string');
const startBtn = document.getElementById('btn-start');
const stepBtn = document.getElementById('btn-step');
const resetBtn = document.getElementById('btn-reset');
const stackPanel = document.getElementById('stack-panel');

function loadMachine(type) {
    currentConfig = machines[type];
    titleEl.innerText = currentConfig.title;
    descEl.innerText = currentConfig.desc;
    
    ui.clearLog();
    ui.log(`Loaded ${currentConfig.title}.`, 'info');
    
    // Setup UI components based on machine type
    if (currentConfig.type === 'PDA') {
        stackPanel.style.display = 'block';
    } else {
        stackPanel.style.display = 'none';
    }
    
    // Render initial graph
    ui.renderGraph(
        currentConfig.type,
        currentConfig.machine.states,
        currentConfig.machine.startState,
        currentConfig.machine.acceptStates || [currentConfig.machine.acceptState],
        currentConfig.machine.transitions
    );
    
    resetSimulation();
}

function resetSimulation() {
    simulationState.running = false;
    simulationState.currentIndex = 0;
    
    if (currentConfig.type === 'TM') {
         currentConfig.machine.reset(inputEl.value);
         ui.updateTape(currentConfig.machine.tape, 0);
    } else {
         currentConfig.machine.reset();
         ui.renderTape(inputEl.value || ' ', 0);
    }
    
    if (currentConfig.type === 'PDA') {
         ui.renderStack(currentConfig.machine.stack);
    }
    
    ui.highlightState(currentConfig.machine.startState);
    
    startBtn.disabled = false;
    stepBtn.disabled = true;
    resetBtn.disabled = true;
    inputEl.disabled = false;
}

function startSimulation() {
    simulationState.inputString = inputEl.value;
    if (currentConfig.type !== 'TM' && simulationState.inputString === '') {
        ui.log("Please enter an input string.", 'error');
        return;
    }
    
    simulationState.running = true;
    simulationState.currentIndex = 0;
    
    startBtn.disabled = true;
    stepBtn.disabled = false;
    resetBtn.disabled = false;
    inputEl.disabled = true;
    
    ui.clearLog();
    ui.log(`Simulation started for input: '${simulationState.inputString}'`);
    
    if (currentConfig.type === 'TM') {
        currentConfig.machine.reset(simulationState.inputString);
        ui.updateTape(currentConfig.machine.tape, currentConfig.machine.headPosition);
    } else {
        currentConfig.machine.reset();
        ui.renderTape(simulationState.inputString, 0);
    }
    
    ui.highlightState(currentConfig.machine.startState);
}

function stepSimulation() {
    if (!simulationState.running) return;
    
    const machine = currentConfig.machine;
    
    if (currentConfig.type === 'DFA') {
        if (simulationState.currentIndex >= simulationState.inputString.length) {
            finishSimulation(machine.isAccepted());
            return;
        }
        
        const char = simulationState.inputString[simulationState.currentIndex];
        const currentState = machine.currentState;
        const result = machine.step(char);
        
        if (result.error) {
             ui.log(result.error, 'error');
             finishSimulation(false);
             return;
        }
        
        ui.log(`Read '${char}', transitioned to ${result.nextState}`);
        ui.animateTransition(currentState, result.nextState);
        simulationState.currentIndex++;
        ui.updateTapeHead(simulationState.currentIndex);
        ui.highlightState(result.nextState);
        
    } else if (currentConfig.type === 'PDA') {
         let char = '';
         if (simulationState.currentIndex < simulationState.inputString.length) {
              char = simulationState.inputString[simulationState.currentIndex];
         }
         
         const currentState = machine.currentState;
         const result = machine.step(char);
         
         if (result.error) {
              ui.log(result.error, 'error');
              finishSimulation(false);
              return;
         }
         
         if (result.epsilon) {
              ui.log(`Epsilon transition to ${result.nextState}`);
         } else {
              ui.log(`Read '${char}', transitioned to ${result.nextState}`);
              simulationState.currentIndex++;
              ui.updateTapeHead(simulationState.currentIndex);
         }
         
         ui.animateTransition(currentState, result.nextState);
         ui.renderStack(result.stack);
         ui.highlightState(result.nextState);
         
         // In PDA, if we exhausted input and are in accept state, or stack is empty
         if (simulationState.currentIndex >= simulationState.inputString.length) {
              // We might need another step for epsilon to accept state
              if (machine.isAccepted()) {
                  finishSimulation(true);
              }
         }
         
    } else if (currentConfig.type === 'TM') {
         const currentState = machine.currentState;
         const result = machine.step();
         
         if (result.halted) {
              finishSimulation(result.state === machine.acceptState);
              return;
         }
         
         if (result.error) {
              ui.log(result.error, 'error');
              finishSimulation(false);
              return;
         }
         
         ui.log(`Read '${result.transitionUsed.write}', moved ${result.transitionUsed.move}, to ${result.nextState}`);
         ui.animateTransition(currentState, result.nextState);
         ui.updateTape(result.tape, result.headPosition);
         ui.highlightState(result.nextState);
    }
}

function finishSimulation(isAccepted) {
    simulationState.running = false;
    stepBtn.disabled = true;
    
    if (isAccepted) {
        ui.log("String ACCEPTED! 🎉", 'success');
        ui.highlightState(currentConfig.machine.currentState, true);
    } else {
        ui.log("String REJECTED. ❌", 'error');
        ui.highlightState(currentConfig.machine.currentState, false, true);
    }
}

// Event Listeners
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if(e.target.dataset.target === 'custom') {
            document.getElementById('builder-modal').classList.add('show');
            return;
        }
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        loadMachine(e.target.dataset.target);
    });
});

startBtn.addEventListener('click', startSimulation);
stepBtn.addEventListener('click', stepSimulation);
resetBtn.addEventListener('click', resetSimulation);

// Init
window.onload = () => {
    loadMachine('dfa');
};

// Builder Logic
const modal = document.getElementById('builder-modal');
const closeModal = document.getElementById('close-modal');
const builderType = document.getElementById('builder-type');
const builderStackGroup = document.getElementById('builder-stack-group');
const transitionsContainer = document.getElementById('transitions-container');
const btnAddTransition = document.getElementById('btn-add-transition');
const btnSaveMachine = document.getElementById('btn-save-machine');

closeModal.addEventListener('click', () => modal.classList.remove('show'));

builderType.addEventListener('change', (e) => {
    builderStackGroup.style.display = (e.target.value === 'PDA' || e.target.value === 'TM') ? 'flex' : 'none';
    transitionsContainer.innerHTML = ''; // clear transitions
});

btnAddTransition.addEventListener('click', () => {
    const type = builderType.value;
    const row = document.createElement('div');
    row.className = 'transition-row';
    
    if (type === 'DFA') {
        row.innerHTML = `
            <input type="text" class="form-input trans-from" placeholder="From">
            <input type="text" class="form-input trans-input" placeholder="Input">
            <span>&rarr;</span>
            <input type="text" class="form-input trans-to" placeholder="To">
            <button class="btn-remove">&times;</button>
        `;
    } else if (type === 'PDA') {
        row.innerHTML = `
            <input type="text" class="form-input trans-from" placeholder="From">
            <input type="text" class="form-input trans-input" placeholder="In (ε='')">
            <input type="text" class="form-input trans-pop" placeholder="Pop">
            <span>&rarr;</span>
            <input type="text" class="form-input trans-to" placeholder="To">
            <input type="text" class="form-input trans-push" placeholder="Push">
            <button class="btn-remove">&times;</button>
        `;
    } else if (type === 'TM') {
        row.innerHTML = `
            <input type="text" class="form-input trans-from" placeholder="From">
            <input type="text" class="form-input trans-read" placeholder="Read">
            <span>&rarr;</span>
            <input type="text" class="form-input trans-write" placeholder="Write">
            <input type="text" class="form-input trans-move" placeholder="L/R">
            <input type="text" class="form-input trans-to" placeholder="To">
            <button class="btn-remove">&times;</button>
        `;
    }
    
    row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
    transitionsContainer.appendChild(row);
});

btnSaveMachine.addEventListener('click', () => {
    const type = builderType.value;
    const states = document.getElementById('builder-states').value.split(',').map(s=>s.trim());
    const alphabet = document.getElementById('builder-alphabet').value.split(',').map(s=>s.trim());
    const stackAlphabet = document.getElementById('builder-stack-alphabet').value.split(',').map(s=>s.trim());
    const start = document.getElementById('builder-start').value.trim();
    const accept = document.getElementById('builder-accept').value.split(',').map(s=>s.trim()).filter(s=>s);
    
    const rows = transitionsContainer.querySelectorAll('.transition-row');
    const transitions = {};
    
    try {
        if (type === 'DFA') {
            rows.forEach(row => {
                const from = row.querySelector('.trans-from').value.trim();
                const input = row.querySelector('.trans-input').value.trim();
                const to = row.querySelector('.trans-to').value.trim();
                if(!transitions[from]) transitions[from] = {};
                transitions[from][input] = to;
            });
            machines.custom = {
                title: "Custom DFA",
                desc: "User defined DFA.",
                type: "DFA",
                machine: new FiniteAutomata(states, alphabet, transitions, start, accept)
            };
        } else if (type === 'PDA') {
            rows.forEach(row => {
                const from = row.querySelector('.trans-from').value.trim();
                const input = row.querySelector('.trans-input').value.trim();
                const pop = row.querySelector('.trans-pop').value.trim();
                const to = row.querySelector('.trans-to').value.trim();
                const pushStr = row.querySelector('.trans-push').value.trim();
                const push = pushStr === '' ? [] : pushStr.split('');
                
                if(!transitions[from]) transitions[from] = {};
                if(!transitions[from][input]) transitions[from][input] = [];
                transitions[from][input].push({ pop, push, nextState: to });
            });
            machines.custom = {
                title: "Custom PDA",
                desc: "User defined PDA.",
                type: "PDA",
                machine: new PushdownAutomata(states, alphabet, stackAlphabet, transitions, start, stackAlphabet[0] || 'Z', accept)
            };
        } else if (type === 'TM') {
            rows.forEach(row => {
                const from = row.querySelector('.trans-from').value.trim();
                const read = row.querySelector('.trans-read').value.trim();
                const write = row.querySelector('.trans-write').value.trim();
                const move = row.querySelector('.trans-move').value.trim().toUpperCase();
                const to = row.querySelector('.trans-to').value.trim();
                
                if(!transitions[from]) transitions[from] = {};
                transitions[from][read] = { write, move, nextState: to };
            });
            machines.custom = {
                title: "Custom TM",
                desc: "User defined TM.",
                type: "TM",
                machine: new TuringMachine(states, alphabet, stackAlphabet, transitions, start, accept[0]||'q_accept', 'q_reject', ' ')
            };
        }
        
        modal.classList.remove('show');
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-target="custom"]').classList.add('active');
        loadMachine('custom');
    } catch (e) {
        alert("Error building machine: " + e.message);
    }
});
