const IOTA = require('iota.lib.js');
const Mam = require('mam.client.js');

// Create IOTA instance directly with provider
const iota = new IOTA({
    provider: "https://nodes.iota.fm:443/"
});

// What is the IOTA lib version
console.log("IOTA Version", iota.version);

// If your node provider does not support attachToTangle you can uncomment the
// following section to use WebGL proof of work
// try {
//     const curl = require('curl.lib.js');
//     curl.init();
//     curl.overrideAttachToTangle(iota);
// } catch (err) {
//     console.error("Error", err);
// }

// Initialise Mam, if you fork the sandbox you should change the seed
console.log("Initializing Mam");
// Create a 81 trytes seed if you want to show previous messages in your mam stream
const seed = undefined; 
if (!seed) {
    console.error("As you have not provided an 81 tryte seed you will never get more than one message in your mam stream");
}
let mamState = Mam.init(iota, seed);
const initialRoot = Mam.getRoot(mamState);

const channelMode = "public" // "private" "restricted"
const retrictedSideKeyTrytes = channelMode == "restricted" ? "THIS9IS9A9RESTRICTED9KEY" : undefined;

// Set the channel mode
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
    return Mam.attach(message.payload, message.address)
        .then(() => message);
}

// Fetch message beginning at the specific root.
function fetchMessages(messageRoot) {
    console.log("Fetching Messages from Root", messageRoot);

    return Mam.fetch(messageRoot, channelMode, retrictedSideKeyTrytes)
        .then(response => {
            response.messages.forEach(messageTrytes => {
                console.log("Fetched Message", iota.utils.fromTrytes(messageTrytes));
            });
            console.log("Next Root", response.nextRoot);
            return response;
        });
}

// Get the current messages from the root to find the start count
// to publish the new message. You could store the start count
// somewhere else and load it here to avoid having to walk
// the tree just to publish a message.
fetchMessages(Mam.getRoot(mamState))
    .then((messageResponse) => {
        mamState.channel.start = messageResponse.messages.length;

        publishMessage(mamState, iota.utils.toTrytes(`This is my message ${messageResponse.messages.length + 1}`))
            .then((message) => {
                console.log("Message Published");
                if (channelMode === "public") {
                    console.log("You can view the message chain on the tangle", `https://thetangle.org/mam/${initialRoot}`);
                    console.log("or just for this message at", `https://thetangle.org/mam/${message.address}`);
                } else {
                    console.log("You can view the transactions for this this message at", `https://thetangle.org/address/${message.address}`);
                }
                fetchMessages(message.root);
            });
    });
