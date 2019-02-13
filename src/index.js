const { asciiToTrytes, trytesToAscii } = require("@iota/converter");
const Mam = require('../lib/mam.client.js');

const provider = "https://nodes.thetangle.org:443";
const attachDepth = 3;
const attachMwm = 14; // Use 9 for devnet
const explorer = "https://thetangle.org" // use https://devnet.thetangle.org for devnet;

// Initialise Mam, if you fork the sandbox you should change the seed
console.log("Initializing Mam");
// Create a 81 trytes seed if you want to show previous messages in your mam stream
const seed = undefined;
if (!seed) {
    console.error("As you have not provided an 81 tryte seed you will never get more than one message in your mam stream");
}
let mamState = Mam.init(provider, seed);
const initialRoot = Mam.getRoot(mamState);

// Set the channel mode
const channelMode = "public" // "private" "restricted"
const retrictedSideKeyTrytes = channelMode === "restricted" ? "THIS9IS9A9RESTRICTED9KEY" : undefined;
console.log("Channel Mode", channelMode);
mamState = Mam.changeMode(mamState, channelMode, retrictedSideKeyTrytes);

// Publish a new message
function publishMessage(mamState, trytesMessage) {
    console.log("Publishing Message", trytesMessage);

    // Create MAM Payload
    const message = Mam.create(mamState, trytesMessage);

    console.log("Root", message.root)
    console.log("Address", message.address)

    // Attach the payload
    console.log("Attaching payload, please wait...")
    return Mam.attach(message.payload, message.address, attachDepth, attachMwm)
        .then(() => message)
        .catch((err) => {
            console.error("There was an error attaching the message", err)
        });
}

// Fetch message beginning at the specific root.
function fetchMessages(messageRoot) {
    console.log("Fetching Messages from Root", messageRoot);

    return Mam.fetch(messageRoot, channelMode, retrictedSideKeyTrytes)
        .then(response => {
            if (response) {
                response.messages.forEach(messageTrytes => {
                    console.log("Fetched Message", trytesToAscii(messageTrytes));
                });
                console.log("Next Root", response.nextRoot);
                return response;
            } else {
                console.error("Unable to fetch messages.")
            }
        });
}

// Get the current messages from the root to find the start count
// to publish the new message. You could store the start count
// somewhere else and load it here to avoid having to walk
// the tree just to publish a message.
fetchMessages(Mam.getRoot(mamState))
    .then((messageResponse) => {
        if (messageResponse) {
            mamState.channel.start = messageResponse.messages.length;

            publishMessage(mamState, asciiToTrytes(`This is my message ${messageResponse.messages.length + 1}`))
                .then((message) => {
                    console.log("Message Published");
                    if (channelMode === "public") {
                        console.log("You can view the message chain on the tangle", `${explorer}/mam/${initialRoot}`);
                        console.log("or just for this message at", `${explorer}/mam/${message.address}`);
                    } else {
                        console.log("You can view the transactions for this this message at", `${explorer}/address/${message.address}`);
                    }
                    fetchMessages(message.root);
                });
        }
    });
