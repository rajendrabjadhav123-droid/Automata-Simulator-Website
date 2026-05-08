class FiniteAutomata {
    constructor(states, alphabet, transitions, startState, acceptStates) {
        this.states = states;
        this.alphabet = alphabet;
        this.transitions = transitions; // { state: { char: nextState } }
        this.startState = startState;
        this.acceptStates = acceptStates;
        
        this.currentState = null;
    }

    reset() {
        this.currentState = this.startState;
    }

    step(char) {
        if (!this.alphabet.includes(char)) {
            return { error: `Invalid character '${char}'` };
        }
        
        const stateTransitions = this.transitions[this.currentState];
        if (stateTransitions && stateTransitions[char]) {
            const nextState = stateTransitions[char];
            this.currentState = nextState;
            return { success: true, nextState };
        } else {
            return { error: `No transition for '${char}' from state ${this.currentState}` };
        }
    }

    isAccepted() {
        return this.acceptStates.includes(this.currentState);
    }
}

class PushdownAutomata {
    constructor(states, inputAlphabet, stackAlphabet, transitions, startState, startStackSymbol, acceptStates) {
        this.states = states;
        this.inputAlphabet = inputAlphabet;
        this.stackAlphabet = stackAlphabet;
        // transitions: { state: { inputChar: [ { topStack: nextState, push: [symbols] } ] } }
        // epsilon input is represented by ''
        this.transitions = transitions; 
        this.startState = startState;
        this.startStackSymbol = startStackSymbol;
        this.acceptStates = acceptStates;
        
        this.currentState = null;
        this.stack = [];
    }

    reset() {
        this.currentState = this.startState;
        this.stack = [this.startStackSymbol];
    }

    step(char) {
        const topStack = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        
        if (char !== '' && !this.inputAlphabet.includes(char)) {
             return { error: `Invalid character '${char}'` };
        }

        const stateTransitions = this.transitions[this.currentState];
        if (stateTransitions) {
            // Check for transition with input char
            let options = stateTransitions[char] || [];
            
            // For determinism in this simple simulation, we just pick the first valid transition
            for (let trans of options) {
                if (trans.pop === topStack || trans.pop === '') {
                    // Valid transition
                    if (trans.pop !== '') {
                        this.stack.pop();
                    }
                    if (trans.push && trans.push.length > 0) {
                        // Push in reverse order so the first string char is on top
                        for (let i = trans.push.length - 1; i >= 0; i--) {
                             if(trans.push[i] !== '') this.stack.push(trans.push[i]);
                        }
                    }
                    this.currentState = trans.nextState;
                    return { success: true, nextState: this.currentState, stack: [...this.stack], transitionUsed: trans };
                }
            }

             // Try epsilon transition if regular input char transition failed
             if (char !== '') {
                 options = stateTransitions[''] || [];
                 for (let trans of options) {
                    if (trans.pop === topStack || trans.pop === '') {
                        if (trans.pop !== '') this.stack.pop();
                        if (trans.push && trans.push.length > 0) {
                            for (let i = trans.push.length - 1; i >= 0; i--) {
                                if(trans.push[i] !== '') this.stack.push(trans.push[i]);
                            }
                        }
                        this.currentState = trans.nextState;
                        // Since it was an epsilon transition, the input char was not consumed.
                        // For simplicity in this step-by-step UI, we will return a flag.
                        return { success: true, nextState: this.currentState, stack: [...this.stack], transitionUsed: trans, epsilon: true };
                    }
                 }
             }
        }
        
        return { error: `No transition from ${this.currentState} with input '${char}' and stack top '${topStack}'` };
    }

    isAccepted() {
        return this.acceptStates.includes(this.currentState) || (this.acceptStates.length === 0 && this.stack.length === 0);
    }
}

class TuringMachine {
    constructor(states, inputAlphabet, tapeAlphabet, transitions, startState, acceptState, rejectState, blankSymbol) {
        this.states = states;
        this.inputAlphabet = inputAlphabet;
        this.tapeAlphabet = tapeAlphabet;
        // transitions: { state: { readSymbol: { writeSymbol, moveDirection, nextState } } }
        this.transitions = transitions;
        this.startState = startState;
        this.acceptState = acceptState;
        this.rejectState = rejectState;
        this.blankSymbol = blankSymbol;
        
        this.currentState = null;
        this.tape = [];
        this.headPosition = 0;
    }

    reset(inputString) {
        this.currentState = this.startState;
        this.tape = inputString.split('');
        if (this.tape.length === 0) {
            this.tape = [this.blankSymbol];
        }
        this.headPosition = 0;
    }

    step() {
        if (this.currentState === this.acceptState || this.currentState === this.rejectState) {
            return { halted: true, state: this.currentState };
        }

        // Expand tape dynamically if head goes out of bounds
        if (this.headPosition < 0) {
            this.tape.unshift(this.blankSymbol);
            this.headPosition = 0;
        } else if (this.headPosition >= this.tape.length) {
            this.tape.push(this.blankSymbol);
        }

        const readSymbol = this.tape[this.headPosition];
        const stateTransitions = this.transitions[this.currentState];

        if (stateTransitions && stateTransitions[readSymbol]) {
            const trans = stateTransitions[readSymbol];
            
            // Write
            this.tape[this.headPosition] = trans.write;
            
            // Move
            if (trans.move === 'R') {
                this.headPosition++;
            } else if (trans.move === 'L') {
                this.headPosition--;
                if (this.headPosition < 0) {
                     this.tape.unshift(this.blankSymbol);
                     this.headPosition = 0;
                }
            }
            
            // Change State
            this.currentState = trans.nextState;
            
            return { 
                success: true, 
                nextState: this.currentState, 
                tape: [...this.tape], 
                headPosition: this.headPosition,
                transitionUsed: trans
            };
        } else {
            // Implicit reject if no transition
            this.currentState = this.rejectState;
            return { error: `No transition defined for state ${this.currentState} reading '${readSymbol}'`, nextState: this.rejectState };
        }
    }
}
