// ============================
// CLIENT DATA STATE
// ============================

export const CLIENT_DATA = {
    playerId: "",
    playerName: "",
    avatar: [1, 1, 1, 1], // [color, face, hair, acc]
    currentParty: null,
    loadedPlayers: [],
    guessesLeft: 0,
    canvasData: {
        isDrawer: false,
        mode: "Draw",
        lastPos: null,
        color: "#000000",
        thickness: 5,
        histories: {
            undo: [],
            redo: [],
        },
    }
};