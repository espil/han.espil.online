
const chat = {
    1: {
        text: 'Hi!',
        options: [
            {
                text: 'Hello!',
                next: 2
            }
        ]
    },
    2: {
        text: 'How may I help you today?',
        next: 3
    },
    3: {
        text: 'Here are some of the options to choose',
        options: [
            {
                text: "<strong>Yes</strong>, I am new customer",
                next: 4
            },
            {
                text: "<strong>Nope</strong>, you have me in your system",
                next: 5
            }
        ]
    },
    4: {
        text: 'Awesome. Thank you for choosing Apex Derm Clinic,please choose from the following options',
        options: [
            {
                text: "<strong>Option 1</strong>",
                next: 6
            },
            {
                text: "<strong>Option 2</strong>",
                next: 7
            },
            {
                text: "<strong>Option 3</strong>",
                next: 8
            },
            {
                text: "<strong>Option 4</strong>",
                next: 9
            }
        ]
    },
    5: {
        text: 'Aha, so it is not your first time with us',
        next: 10
    },
    6: {
        text: 'You have selected Option 1',
        options: [
            {
                text: "Please fill out our form here",
                url: "http://reservation.usedesign.rf.gd/form1.html"
            }
        ]
    },
    7: {
        text: 'You have selected Option 2',
        options: [
            {
                text: "Please fill out our form here",
                url: "http://reservation.usedesign.rf.gd/form2.html"
            }
        ]
    },
    8: {
        text: 'You have selected Option 3',
        options: [
            {
                text: "Please fill out our form here",
                url: "http://reservation.usedesign.rf.gd/form3.html"
            }
        ]
    },
    9: {
        text: 'You have selected Option 4',
        options: [
            {
                text: "Please fill out our form here",
                url: "http://reservation.usedesign.rf.gd/form4.html"
            }
        ]
    },    
    10: {
        text: 'Which of the following services are you here for today?',
        options: [
            {
                text: "<strong>Edit my Existing Reservation</strong>",
                next: 11
            },
            {
                text: "<strong>Make a New Reservation</strong>",
                next: 12
            }
        ]
    },
    11: {
        
            text: 'So, you would like to edit an existing reservation! Please enter your name and reservation number:',
            input: {
                type: 'text',
                placeholder: 'Your Reservation Number',
                submit: {
                    text: 'Search',
                    next: 14
                }
            }
        
    },
    12: {
        
        text: 'So, you would like to create a reservation! Please enter your name,',
        input: {
            type: 'text',
            placeholder: 'Your Name',
            submit: {
                text: 'Submit',
                next: 13
            }
        }
    
},
    13: {
        text: 'Please choose a date for your appointment:',
        next: 13_1
    },
    13_1: {
        input: {
            type: 'date',
            submit: {
                text: 'Submit',
                next: 15
            }
        },
        options: [
            {
                text: 'Go back',
                next: 11
            }
        ]
    },
    14: {
        text: 'Please choose a date for your appointment:',
    },
    14_1: {
        input: {
            type: 'date',
            placeholder: 'Select Date',
            submit: {
                text: 'Submit',
                next: 15
            }
        }
    },
    15: {
        text: 'Please choose a time slot for your appointment:',
        input: {
            type: 'time',
            options: {
                start: '09:00',
                end: '18:00',
                interval: 10
            },
            submit: {
                text: 'Submit',
                next: 16
            }
        }
    },
    16: {
        text: 'Thank you! Your appointment has been scheduled.',
        options: [
            {
                text: 'Start over',
                next: 1
            }
        ]
    },
};
