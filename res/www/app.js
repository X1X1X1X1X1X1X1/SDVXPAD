const throttle = (func, wait) => {
    var ready = true;
    var args = null;
    return function throttled() {
        var context = this;
        if (ready) {
            ready = false;
            setTimeout(function () {
                ready = true;
                if (args) {
                    throttled.apply(context);
                }
            }, wait);
            if (args) {
                func.apply(this, args);
                args = null;
            } else {
                func.apply(this, arguments);
            }
        } else {
            args = arguments;
        }
    };
};

// Element refs
var keys = document.getElementsByClassName('container')[0].children;
var allKeys = [];
const compileKey = (key) => {
    return {
        top: key.offsetTop,
        bottom: key.offsetTop + key.offsetHeight,
        left: key.offsetLeft,
        right: key.offsetLeft + key.offsetWidth,
        kflag: keyMap.findIndex((x) => { return x == key.innerText.toUpperCase() }) - 1,
        ref: key,
    };
};
const isInside = (x, y, compiledKey) => {
    return (
        compiledKey.left <= x &&
        x < compiledKey.right &&
        compiledKey.top <= y &&
        y < compiledKey.bottom
    );
};
const compileKeys = () => {
    allKeys = []
    for (var i = 0, key; i < keys.length; i++) {
        const compiledKey = compileKey(keys[i]);
        allKeys.push(compiledKey);
    }
};

const getKey = (x, y) => {
    for (var i = 0; i < allKeys.length; i++) {
        if (isInside(x, y, allKeys[i])) return allKeys[i];
    }
    return null;
};

const keyMap = [
    '6', 'A', '4', 'S', '2', 'D', '0', 'F',
    'X', 'Z', 'V', 'C', 'T', 'S', 'R', 'Q',
    'P', 'O', 'N', 'M', 'L', 'K', 'J', 'I',
    'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
    'Y', 'Q', 'W', 'E', 'R', 'T'
];

// Button State
// prettier-ignore
var lastState = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
];

function updateTouches(e) {
    try {
        e.preventDefault();

        // prettier-ignore
        var keyFlags = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
        ];

        throttledRequestFullscreen();

        for (var i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];

            const x = touch.clientX;
            const y = touch.clientY;

            const key = getKey(x, y);

            if (!key) continue;

            setKey(keyFlags, key.kflag);

        }

        // Render keys
        for (var i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];
            const kflag = key.kflag;
            if (keyFlags[kflag] !== lastState[kflag]) {
                if (keyFlags[kflag]) {
                    key.ref.setAttribute("data-active", "");
                } else {
                    key.ref.removeAttribute("data-active");
                }
            }
        }

        if (keyFlags !== lastState) {
            throttledSendKeys(keyFlags);
        }
        lastState = keyFlags;
    } catch (err) {
        alert(err);
    }
}
const throttledUpdateTouches = throttle(updateTouches, 10);

const setKey = (keyFlags, kflag) => {
    var idx = kflag;
    if (keyFlags[idx]) {
        idx++;
    }
    keyFlags[idx] = 1;
};

const sendKeys = (keyFlags) => {
    if (wsConnected) {
        ws.send("b" + keyFlags.join(""));
    }
};
const throttledSendKeys = throttle(sendKeys, 10);

// Websockets
var ws = null;
var wsTimeout = 0;
var wsConnected = false;
const wsConnect = () => {
    ws = new WebSocket("ws://" + location.host + "/ws");
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
        ws.send("alive?");
    };
    ws.onmessage = (e) => {
        if (e.data.byteLength) {

        } else if (e.data == "alive") {
            wsTimeout = 0;
            wsConnected = true;
        }
    };
};
const wsWatch = () => {
    if (wsTimeout++ > 2) {
        wsTimeout = 0;
        ws.close();
        wsConnected = false;
        wsConnect();
        return;
    }
    if (wsConnected) {
        ws.send("alive?");
    }
};

// Fullscreener
const requestFullscreen = () => {
    if (!document.fullscreenElement && screen.height <= 1024) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullScreen) {
            document.documentElement.webkitRequestFullScreen();
        }
    }
};
const throttledRequestFullscreen = throttle(requestFullscreen, 3000);

// Do update hooks
const cnt = document.getElementsByClassName("container")[0];

cnt.addEventListener("touchstart", updateTouches);
cnt.addEventListener("touchmove", updateTouches);
cnt.addEventListener("touchend", updateTouches);


// Initialize
const initialize = () => {
    compileKeys();
    wsConnect();
    setInterval(wsWatch, 1000);
};
initialize();

// Update keys on resize
window.onresize = compileKeys;
