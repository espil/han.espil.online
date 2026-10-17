
const bot = function () {

    const peekobot = document.getElementById('peekobot');
    const container = document.getElementById('peekobot-container');
    const inner = document.getElementById('peekobot-inner');
    let restartButton = null;

    const sleep = function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    const scrollContainer = function () {
        inner.scrollTop = inner.scrollHeight;
    };

    const insertNewChatItem = function (elem) {
        //container.insertBefore(elem, peekobot);
        peekobot.appendChild(elem);
        scrollContainer();
        //debugger;
        elem.classList.add('activated');
    };

    const printResponse = async function (step) {
        const response = document.createElement('div');
        response.classList.add('chat-response');
        response.innerHTML = step.text;
        insertNewChatItem(response);
    
        await sleep(1500);
    
        if (step.input) {
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('input-wrapper');
    
            if (step.input.type === 'time') {
                const select = document.createElement('select');
    
                const start = moment(step.input.options.start, 'HH:mm');
                const end = moment(step.input.options.end, 'HH:mm');
                const interval = step.input.options.interval;
    
                while (start.isBefore(end)) {
                    const option = document.createElement('option');
                    option.value = start.format('HH:mm');
                    option.textContent = start.format('hh:mm A');
                    select.appendChild(option);
    
                    start.add(interval, 'minutes');
                }
    
                inputWrapper.appendChild(select);
            } else {
                const input = document.createElement('input');
                if (step.input.type === 'date') {
                    input.type = 'text';
                    input.placeholder = 'Choose a date';
                    inputWrapper.appendChild(input);
    
                    // Initialize flatpickr on the input
                    flatpickr(input, {
                        dateFormat: 'Y-m-d',
                        minDate: 'today',
                    });
                } else {
                    input.type = step.input.type;
                    if (step.input.placeholder) {
                        input.placeholder = step.input.placeholder;
                    }
                    inputWrapper.appendChild(input);
                }
            }
    
            const submitButton = document.createElement('button');
            submitButton.textContent = step.input.submit.text;
            submitButton.classList.add('input-submit');
            inputWrapper.appendChild(submitButton);
    
            submitButton.addEventListener('click', async () => {
                const inputElem = inputWrapper.querySelector('input, select');
                if (!inputElem.value) return;
    
                const inputValueElem = document.createElement('div');
                inputValueElem.classList.add('chat-ask');
                inputValueElem.textContent = inputElem.value;
                insertNewChatItem(inputValueElem);
    
                await sleep(1500);
    
                if (step.input.submit.next) {
                    printResponse(chat[step.input.submit.next]);
                }
            });
    
            insertNewChatItem(inputWrapper);
        }
    
        if (step.options) {
            const choices = document.createElement('div');
            choices.classList.add('choices');
            step.options.forEach(function (option) {
                const button = document.createElement(option.url ? 'a' : 'button');
                button.classList.add('choice');
                button.innerHTML = option.text;
                if (option.url) {
                    button.href = option.url;
                } else {
                    button.dataset.next = option.next;
                }
                choices.appendChild(button);
            });
            insertNewChatItem(choices);
        } else if (step.next) {
            printResponse(chat[step.next]);
        }
    };
    
    
    const printChoice = function (choice) {
        const choiceElem = document.createElement('div');
        choiceElem.classList.add('chat-ask');
        choiceElem.innerHTML = choice.innerHTML;
        insertNewChatItem(choiceElem);
    };

    const disableAllChoices = function () {
        const choices = document.querySelectorAll('.choice');
        choices.forEach(function (choice) {
            choice.disabled = 'disabled';
        });
        return;
    };

    const handleInputSubmit = async function (inputElem, submitButton) {
        const inputValue = inputElem.value;
        if (!inputValue) return;

        const inputResponse = document.createElement('div');
        inputResponse.classList.add('chat-ask');
        inputResponse.innerHTML = inputValue;
        insertNewChatItem(inputResponse);

        disableAllChoices();

        scrollContainer();

        await sleep(1500);

        if (submitButton.dataset.next) {
            printResponse(chat[submitButton.dataset.next]);
        }
    };

    const handleChoice = async function (e) {

        if (!e.target.classList.contains('choice') || 'A' === e.target.tagName) {
            // Target isn't a button, but could be a child of a button.
            var button = e.target.closest('#peekobot-container .choice');

            if (button !== null) {
                button.click();
            }

            return;
        }

        e.preventDefault();
        const choice = e.target;

        disableAllChoices();

        printChoice(choice);
        scrollContainer();

        await sleep(1500);

        if (choice.dataset.next) {
            printResponse(chat[choice.dataset.next]);
        }
        // Need to disable buttons here to prevent multiple choices
    };

    const handleRestart = function () {
        startConversation();
    }

    const startConversation = function () {
        printResponse(chat[1]);
    }

    const init = function () {
        container.addEventListener('click', handleChoice);

        restartButton = document.createElement('button');
        restartButton.innerText = "Restart";
        restartButton.classList.add('restart');
        restartButton.addEventListener('click', handleRestart);

        container.appendChild(restartButton);

        startConversation();
    };

    init();
}

bot();