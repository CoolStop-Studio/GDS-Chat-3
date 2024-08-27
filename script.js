let currentUser = "";
let currentPartner = "";
let messageCache = {};
let lastTimestamp = {};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("version-display").textContent = `v${app_version}`;
    setupInputListeners();
    setupFormToggle();
});

function setupInputListeners() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const newUsernameInput = document.getElementById("new-username");
    const newPasswordInput = document.getElementById("new-password");
    const loginButton = document.getElementById("login-button");
    const createAccountButton = document.getElementById(
        "create-account-button",
    );
    const newMessageInput = document.getElementById("new-message");
    const sendNewMessageButton = document.getElementById(
        "send-new-message-button",
    );
    const messageInput = document.getElementById("message");
    const sendMessageButton = document.getElementById("send-message-button");

    function validateInputs(usernameInput, passwordInput, button) {
        const usernameValid =
            usernameInput.value.length >= min_username_length &&
            usernameInput.value.length <= max_username_length;
        const passwordValid =
            passwordInput.value.length >= min_password_length &&
            passwordInput.value.length <= max_password_length;
        button.disabled = !(usernameValid && passwordValid);
    }

    usernameInput.addEventListener("input", () =>
        validateInputs(usernameInput, passwordInput, loginButton),
    );
    passwordInput.addEventListener("input", () =>
        validateInputs(usernameInput, passwordInput, loginButton),
    );
    newUsernameInput.addEventListener("input", () =>
        validateInputs(newUsernameInput, newPasswordInput, createAccountButton),
    );
    newPasswordInput.addEventListener("input", () =>
        validateInputs(newUsernameInput, newPasswordInput, createAccountButton),
    );

    newMessageInput.addEventListener("input", () => {
        sendNewMessageButton.disabled =
            newMessageInput.value.length < min_message_length ||
            newMessageInput.value.length > max_message_length;
    });

    messageInput.addEventListener("input", () => {
        sendMessageButton.disabled =
            messageInput.value.length < min_message_length ||
            messageInput.value.length > max_message_length;
    });
}

function setupFormToggle() {
    const toggleButton = document.getElementById('toggle-form');
    const loginInputs = document.getElementById('login-inputs');
    const createAccountInputs = document.getElementById('create-account-inputs');

    toggleButton.addEventListener('click', () => {
        if (loginInputs.style.display !== 'none') {
            loginInputs.style.display = 'none';
            createAccountInputs.style.display = 'flex';
            toggleButton.textContent = 'Back to Login';
        } else {
            loginInputs.style.display = 'flex';
            createAccountInputs.style.display = 'none';
            toggleButton.textContent = 'Create New Account';
        }
    });
}

function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                currentUser = username;
                document.getElementById("user-display").textContent = username;
                document.getElementById("login-form").style.display = "none";
                document.getElementById("app-container").style.display = "flex";
                fetchConversations();
            } else {
                alert(data.message);
            }
        });
}

function createAccount() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Account created successfully. You can now log in.');
            document.getElementById('toggle-form').click(); // Switch back to login form
        } else {
            alert(data.message); // This will now show "Username already exists" if applicable
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while creating the account. Please try again.');
    });
}

function logout() {
    currentUser = '';
    currentPartner = '';
    messageCache = {};
    lastTimestamp = {};
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('login-inputs').style.display = 'block';
    document.getElementById('create-account-inputs').style.display = 'none';
    document.getElementById('toggle-form').textContent = 'Create New Account';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-button').disabled = true;
}

function showNewMessageForm() {
    document.getElementById("new-message-form").style.display = "block";
}

function cancelNewMessage() {
    document.getElementById("new-message-form").style.display = "none";
    document.getElementById("new-recipient").value = "";
    document.getElementById("new-message").value = "";
    document.getElementById("send-new-message-button").disabled = true;
}

function sendNewMessage() {
    const recipient = document.getElementById("new-recipient").value.trim();
    const message = document.getElementById("new-message").value.trim();
    if (
        recipient.length >= min_username_length &&
        recipient.length <= max_username_length &&
        message.length >= min_message_length &&
        message.length <= max_message_length
    ) {
        sendMessageToServer(recipient, message);
        cancelNewMessage();
    } else {
        alert(
            `Recipient must be between ${min_username_length} and ${max_username_length} characters, and message must be between ${min_message_length} and ${max_message_length} characters.`,
        );
    }
}

function sendMessage() {
    const message = document.getElementById('message').value.trim();
    if (currentPartner && message.length >= min_message_length && message.length <= max_message_length) {
        sendMessageToServer(currentPartner, message);
        document.getElementById('message').value = '';
        document.getElementById('send-message-button').disabled = true;
    } else {
        alert(`Message must be between ${min_message_length} and ${max_message_length} characters.`);
    }
}

function sendMessageToServer(recipient, message) {
    fetch('/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, recipient, message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchConversations();
            // Don't update the cache here, let the fetchMessages function handle it
            if (recipient === currentPartner) {
                fetchMessages(currentPartner);
            }
        }
    });
}

function fetchConversations() {
    fetch(`/conversations/${currentUser}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                const conversationsDiv =
                    document.getElementById("conversations");
                conversationsDiv.innerHTML = "";
                data.conversations.forEach((conv) => {
                    const convDiv = document.createElement("div");
                    convDiv.className = "conversation";
                    convDiv.textContent = conv.conversation_partner;
                    convDiv.onclick = () =>
                        selectConversation(conv.conversation_partner);
                    if (conv.conversation_partner === currentPartner) {
                        convDiv.classList.add("selected");
                    }
                    conversationsDiv.appendChild(convDiv);
                });
            }
        });
}

function selectConversation(partner) {
    currentPartner = partner;
    document.querySelectorAll(".conversation").forEach((el) => {
        el.classList.toggle("selected", el.textContent === partner);
    });
    document.getElementById("chat-partner").textContent = partner;
    document.getElementById("message-input").style.display = "flex";

    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = '<div class="loading">Loading messages...</div>';

    if (messageCache[partner]) {
        displayMessages(messageCache[partner]);
    }

    fetchMessages(partner);
}

function fetchMessages(partner) {
    const timestamp = lastTimestamp[partner] || "1970-01-01T00:00:00.000Z";
    fetch(
        `/new-messages/${currentUser}/${partner}/${encodeURIComponent(timestamp)}`,
    )
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                if (!messageCache[partner]) {
                    messageCache[partner] = [];
                }
                messageCache[partner] = messageCache[partner].concat(
                    data.messages,
                );
                if (data.messages.length > 0) {
                    lastTimestamp[partner] =
                        data.messages[data.messages.length - 1].timestamp;
                }
                if (partner === currentPartner) {
                    displayMessages(messageCache[partner]);
                }
            }
        });
}

function displayMessages(messages) {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";
    messages.forEach((msg) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = msg.sender === currentUser ? "sent" : "received";
        msgDiv.textContent = `${msg.sender}: ${msg.message}`;
        messagesDiv.appendChild(msgDiv);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Fetch conversations every 5 seconds
setInterval(fetchConversations, 5000);

// Fetch messages for the current conversation every 5 seconds
setInterval(() => {
    if (currentPartner) {
        fetchMessages(currentPartner);
    }
}, 5000);

// Initial fetch of conversations
fetchConversations();
