require('regenerator-runtime/runtime');
const { logOutput, logError, logLink, clearOutput } = require("./output.js");
const { asciiToTrytes, trytesToAscii } = require("@iota/converter");
const Mam = require('@iota/mam');

const provider = "https://nodes.thetangle.org:443";
const attachDepth = 3;
const attachMwm = 14; // Use 9 for devnet
const explorer = "https://thetangle.org" // use https://devnet.thetangle.org for devnet;

// Initialise Mam, if you fork the sandbox you should change the seed
clearOutput();
logOutput("Initializing Mam");
// Create a 81 trytes seed if you want to show previous messages in your mam channel
const seed = undefined;
if (!seed) {
    logError("As you have not populated an 81 tryte seed you will never get more than one message in your mam channel");
}
let mamState = Mam.init(provider, seed);
const initialRoot = Mam.getRoot(mamState);

// Set the channel mode
const channelMode = "public" // "private" "restricted"
const retrictedSideKeyTrytes = channelMode === "restricted" ? "THIS9IS9A9RESTRICTED9KEY" : undefined;
logOutput(`Channel Mode: ${channelMode}`);
mamState = Mam.changeMode(mamState, channelMode, retrictedSideKeyTrytes);

// Publish a new message
async function publishMessage(mamState, trytesMessage) {
    logOutput(`Publishing Message: ${trytesMessage}`);

    // Create MAM Payload
    const message = Mam.create(mamState, trytesMessage);

    logOutput(`Root: ${message.root}`);
    logOutput(`Address: ${message.address}`);

    // Attach the payload
    logOutput("Attaching payload, please wait...");

    try {
        await Mam.attach(message.payload, message.address, attachDepth, attachMwm);
        return message;
    } catch (err) {
        logError("There was an error attaching the message", err);
    }
}

// Fetch message beginning at the specific root.
async function fetchMessages(messageRoot) {
    logOutput(`Fetching Messages from Root: ${messageRoot}`);

    try {
        const response = await Mam.fetch(messageRoot, channelMode, retrictedSideKeyTrytes);

        if (response) {
            if (!response.messages || response.messages.length === 0) {
                logOutput("There are no messages.")
            } else {
                response.messages.forEach(messageTrytes => {
                    logOutput(`Fetched Message: ${trytesToAscii(messageTrytes)}`);
                });
            }
            logOutput(`Next Root: ${response.nextRoot}`);
        }
        return response;
    } catch (err) {
        logError("There was an error fetching messages", err);
    }
}


// Get the current messages from the root to find the start count
// to publish the new message. You could store the start count/mam state
// somewhere else and load it here to avoid having to walk
// the tree just to publish a message.
(async function () {
    try {
        const messageResponse = await fetchMessages(Mam.getRoot(mamState))

        if (messageResponse) {
            mamState.channel.start = messageResponse.messages.length;

            const message = await publishMessage(mamState, asciiToTrytes(`This is my message ${messageResponse.messages.length + 1}`));

            logOutput("Message Published");
            if (channelMode === "public") {
                logOutput(`You can view the message chain on the tangle:`);
                logLink(`${explorer}/mam/${initialRoot}`);
                logOutput(`or just for this message at:`);
                logLink(`${explorer}/mam/${message.address}`);
            } else {
                logOutput(`You can view the transactions for this this message at:`);
                logLink(`${explorer}/address/${message.address}`);
            }
            await fetchMessages(message.root);
        }
    } catch (err) {
        logError("Error fetching messages", err);
    }
    logOutput("Finished.");
})();

