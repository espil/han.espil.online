const chat = {
    1: {
        text: "Yo, I'm Leigh Combs, your friendly gangster guide to *Capilano Theft Auto*! 🚗💥 What’s up?",
        options: [
            {
                text: "Tell me about this game!",
                next: 2
            },
            {
                text: "How can I sign up for the beta?",
                next: 3
            },
            {
                text: "How can I support this project?",
                next: 4
            }
        ]
    },
    2: {
        text: "This is no ordinary game, my friend. *Capilano Theft Auto* is set on the wild campus of Capilano University. It’s a multiplayer open-world adventure where students do what they do best—chat, share, drive, and survive. Oh, and watch out for trolls with cars and guns. 😏",
        options: [
            {
                text: "What else can I do in the game?",
                next: 5
            },
            {
                text: "Sounds sick. How can I sign up?",
                next: 3
            }
        ]
    },
    3: {
        text: "You wanna be part of the beta gang? Register as a student for the trial version! Just drop your deets (name, age, email) here, and you’re in: <a href='https://docs.google.com/forms/d/e/1FAIpQLSdNZqlQMp-YEZaedIaK2kzezILEAEbaGfiAs370RqmNKG52Kw/viewform?usp=header' target='_blank'>Beta Signup Form</a>.",
        options: [
            {
                text: "Alright, I’ll fill that out!",
                next: 6
            },
            {
                text: "I have more questions.",
                next: 7
            }
        ]
    },
    4: {
        text: "A gangster's dream ain't cheap, you know? We need funding to run multiplayer servers, build the world, and keep the fun alive. Wanna help? Drop some love here: <strong>donations link coming soon</strong>. Or, tell us what you’d like to see in the game: <a href='https://docs.google.com/forms/d/e/1FAIpQLScRYxZPCTmg0w--bLAD1KOhGoqnSIw-diyF7M3NqBAu3z17Cw/viewform?usp=header' target='_blank'>Feedback Form</a>.",
        options: [
            {
                text: "I’ll check that out.",
                next: 6
            },
            {
                text: "Back to main menu.",
                next: 1
            }
        ]
    },
    5: {
        text: "What can’t you do? You can chat (with voice or text), trade crypto via MetaMask to ‘share homework’ 😉, advertise your needs with macro bubbles, or just troll around in cars. And yeah, it’s just the beginning—we’re building a world beyond Capilano U. 🌍",
        options: [
            {
                text: "What’s this crypto stuff about?",
                next: 8
            },
            {
                text: "I wanna sign up for the beta!",
                next: 3
            }
        ]
    },
    6: {
        text: "Sweet! You’re officially on track to be part of the beta gang. Keep an eye on your email for updates. Anything else I can help with?",
        options: [
            {
                text: "Tell me more about the game!",
                next: 2
            },
            {
                text: "How can I support this project?",
                next: 4
            }
        ]
    },
    7: {
        text: "Shoot your questions! I’ve got answers. Or, head back to the main menu if you wanna explore other options.",
        options: [
            {
                text: "Back to main menu.",
                next: 1
            }
        ]
    },
    8: {
        text: "Crypto is the future, buddy. In *CTA*, you can use MetaMask to send crypto for anything—homework, ‘extracurriculars,’ or hookups. Just keep it on the down-low. 🔒",
        options: [
            {
                text: "I’ll keep it secret. How can I sign up?",
                next: 3
            },
            {
                text: "Back to main menu.",
                next: 1
            }
        ]
    }
};
