class UIController {
    constructor() {
        this.graphContainer = document.getElementById('graph-container');
        this.tapeContainer = document.getElementById('tape');
        this.tapeHead = document.getElementById('tape-head');
        this.stackContainer = document.getElementById('stack');
        this.statusMessage = document.getElementById('status-message');
        this.nodes = {};
    }

    renderGraph(machineType, states, startState, acceptStates, transitions) {
        const nodesToRemove = this.graphContainer.querySelectorAll('.state-node, .transition-label');
        nodesToRemove.forEach(n => n.remove());
        
        const svg = document.getElementById('edges');
        if (svg) {
            const defs = svg.querySelector('defs');
            svg.innerHTML = '';
            if (defs) svg.appendChild(defs);
        }

        this.nodes = {};
        
        const radius = 120;
        const centerX = (this.graphContainer.clientWidth || 600) / 2;
        const centerY = (this.graphContainer.clientHeight || 300) / 2;
        
        const nodePositions = {};

        states.forEach((state, index) => {
            let x = centerX, y = centerY;
            if (states.length > 1) {
                const angle = (index / states.length) * 2 * Math.PI - Math.PI/2;
                x = centerX + radius * Math.cos(angle);
                y = centerY + radius * Math.sin(angle);
            }
            nodePositions[state] = { x, y };
            
            const node = document.createElement('div');
            node.className = `state-node`;
            node.id = `node-${state}`;
            node.innerText = state;
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            
            if (state === startState) node.classList.add('start');
            if (acceptStates.includes(state)) node.classList.add('accept');
            
            this.graphContainer.appendChild(node);
            this.nodes[state] = node;
        });

        if (svg) {
            const edgeMap = {};

            if (machineType === 'DFA') {
                for (const [fromState, transMap] of Object.entries(transitions)) {
                    for (const [char, toState] of Object.entries(transMap)) {
                        const key = `${fromState}->${toState}`;
                        if (!edgeMap[key]) edgeMap[key] = [];
                        edgeMap[key].push(char);
                    }
                }
            } else if (machineType === 'PDA') {
                 for (const [fromState, transMap] of Object.entries(transitions)) {
                    for (const [char, options] of Object.entries(transMap)) {
                        options.forEach(opt => {
                            const key = `${fromState}->${opt.nextState}`;
                            if (!edgeMap[key]) edgeMap[key] = [];
                            const pop = opt.pop === '' ? 'ε' : opt.pop;
                            const push = (opt.push && opt.push.length > 0 && opt.push[0] !== '') ? opt.push.join('') : 'ε';
                            const input = char === '' ? 'ε' : char;
                            edgeMap[key].push(`${input},${pop}/${push}`);
                        });
                    }
                 }
            } else if (machineType === 'TM') {
                for (const [fromState, transMap] of Object.entries(transitions)) {
                    for (const [char, opt] of Object.entries(transMap)) {
                        const key = `${fromState}->${opt.nextState}`;
                        if (!edgeMap[key]) edgeMap[key] = [];
                        edgeMap[key].push(`${char}/${opt.write},${opt.move}`);
                    }
                }
            }

            for (const [key, labels] of Object.entries(edgeMap)) {
                const [from, to] = key.split('->');
                if (!nodePositions[from] || !nodePositions[to]) continue;

                const p1 = nodePositions[from];
                const p2 = nodePositions[to];
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const labelStr = labels.join(' | ');

                if (from === to) {
                    path.setAttribute('d', `M ${p1.x - 10} ${p1.y - 30} C ${p1.x - 50} ${p1.y - 100}, ${p1.x + 50} ${p1.y - 100}, ${p1.x + 10} ${p1.y - 30}`);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', 'rgba(255,255,255,0.2)');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('marker-end', 'url(#arrow)');
                    path.id = `edge-${from}-${to}`;
                    svg.appendChild(path);
                    
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'transition-label';
                    labelDiv.id = `label-${from}-${to}`;
                    labelDiv.innerText = labelStr;
                    labelDiv.style.left = `${p1.x}px`;
                    labelDiv.style.top = `${p1.y - 85}px`;
                    labelDiv.style.transform = `translate(-50%, -50%)`;
                    this.graphContainer.appendChild(labelDiv);
                } else {
                    const revKey = `${to}->${from}`;
                    const offset = edgeMap[revKey] ? 30 : 0;
                    
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const angle = Math.atan2(dy, dx);
                    
                    const r = 32;
                    const startX = p1.x + r * Math.cos(angle);
                    const startY = p1.y + r * Math.sin(angle);
                    const endX = p2.x - r * Math.cos(angle);
                    const endY = p2.y - r * Math.sin(angle);

                    const midX = (startX + endX) / 2 - offset * Math.sin(angle);
                    const midY = (startY + endY) / 2 + offset * Math.cos(angle);

                    path.setAttribute('d', `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', 'rgba(255,255,255,0.2)');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('marker-end', 'url(#arrow)');
                    path.id = `edge-${from}-${to}`;
                    svg.appendChild(path);

                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'transition-label';
                    labelDiv.id = `label-${from}-${to}`;
                    labelDiv.innerText = labelStr;
                    labelDiv.style.left = `${midX}px`;
                    labelDiv.style.top = `${midY}px`;
                    labelDiv.style.transform = `translate(-50%, -50%)`;
                    this.graphContainer.appendChild(labelDiv);
                }
            }
        }
    }

    highlightState(stateId, isAccept = false, isReject = false) {
        // Reset all
        Object.values(this.nodes).forEach(node => {
            node.classList.remove('active', 'accept-active', 'reject');
        });
        
        if (this.nodes[stateId]) {
            this.nodes[stateId].classList.add('active');
            if (isAccept) this.nodes[stateId].classList.add('accept');
            if (isReject) this.nodes[stateId].classList.add('reject');
        }
    }

    animateTransition(fromState, toState) {
        const edge = document.getElementById(`edge-${fromState}-${toState}`);
        const label = document.getElementById(`label-${fromState}-${toState}`);
        if (edge) {
            edge.classList.remove('pulse-animation');
            void edge.offsetWidth; // trigger reflow
            edge.classList.add('pulse-animation');
        }
        if (label) {
            label.classList.remove('pulse-label-animation');
            void label.offsetWidth; // trigger reflow
            label.classList.add('pulse-label-animation');
        }
    }

    renderTape(string, headPosition = 0) {
        this.tapeContainer.innerHTML = '';
        const chars = string.split('');
        if (chars.length === 0) chars.push(' ');
        
        chars.forEach((char, index) => {
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            cell.innerText = char === ' ' ? 'B' : char; // B for blank
            cell.id = `tape-cell-${index}`;
            this.tapeContainer.appendChild(cell);
        });
        
        this.updateTapeHead(headPosition);
    }

    updateTape(tapeArray, headPosition) {
        this.tapeContainer.innerHTML = '';
        tapeArray.forEach((char, index) => {
             const cell = document.createElement('div');
             cell.className = 'tape-cell';
             cell.innerText = char === ' ' ? 'B' : char;
             cell.id = `tape-cell-${index}`;
             this.tapeContainer.appendChild(cell);
        });
        this.updateTapeHead(headPosition);
    }

    updateTapeHead(position) {
        const cells = this.tapeContainer.children;
        // Remove active class from all cells
        Array.from(cells).forEach(cell => cell.classList.remove('active'));
        
        if (cells[position]) {
             cells[position].classList.add('active');
             // Animate tape move
             const cellWidth = 50; // based on CSS
             // Since .tape has left: 50%, we just translate back by the cell's center position
             const offset = -(position * cellWidth) - (cellWidth / 2);
             this.tapeContainer.style.transform = `translateX(${offset}px)`;
        }
    }

    renderStack(stackArray) {
        this.stackContainer.innerHTML = '';
        // Stack grows upwards in UI
        for (let i = 0; i < stackArray.length; i++) {
            const item = document.createElement('div');
            item.className = 'stack-item';
            item.innerText = stackArray[i] === 'Z' ? 'Z₀' : stackArray[i];
            this.stackContainer.appendChild(item);
        }
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerText = message;
        this.statusMessage.appendChild(entry);
        this.statusMessage.scrollTop = this.statusMessage.scrollHeight;
    }

    clearLog() {
        this.statusMessage.innerHTML = '';
    }
}
