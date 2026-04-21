import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { GameState, Player, Role, Phase } from './types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let gameState: GameState = {
  players: [],
  phase: 'LOBBY',
  dayCount: 0,
  witchHasLifePotion: true,
  witchHasDeathPotion: true,
};

let votes: Record<string, string> = {}; // voterId -> targetId
let nightActions: Record<string, any> = {
  werewolfTarget: null,
  seerTarget: null,
  witchSave: false,
  witchKill: null,
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Send current state immediately so the client isn't stuck loading
  socket.emit("gameStateUpdate", gameState);

  socket.on("joinRoom", (name: string) => {
    const isHost = gameState.players.length === 0;
    const newPlayer: Player = {
      id: socket.id,
      name,
      isAlive: true,
      isReady: false,
      isHost,
    };
    gameState.players.push(newPlayer);
    io.emit("gameStateUpdate", gameState);
  });

  socket.on("readyUp", () => {
    const player = gameState.players.find((p: Player) => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.emit("gameStateUpdate", gameState);
    }
  });

  socket.on("startGame", () => {
    const player = gameState.players.find((p: Player) => p.id === socket.id);
    if (player?.isHost && gameState.players.length >= 4) {
      assignRoles();
      gameState.phase = 'NIGHT';
      gameState.dayCount = 1;
      io.emit("gameStateUpdate", gameState);
    }
  });

  socket.on("roleAction", (action: string, targetId?: string) => {
    const player = gameState.players.find((p: Player) => p.id === socket.id);
    if (!player || !player.isAlive || gameState.phase !== 'NIGHT') return;

    if (player.role === 'WEREWOLF' && action === 'kill' && targetId) {
      nightActions.werewolfTarget = targetId;
      checkNightEnd();
    } else if (player.role === 'SEER' && action === 'see' && targetId) {
      const target = gameState.players.find((p: Player) => p.id === targetId);
      socket.emit("actionResult", `Le rôle de ${target?.name} est ${target?.role}`);
      nightActions.seerTarget = targetId;
      checkNightEnd();
    } else if (player.role === 'WITCH') {
      if (action === 'save' && gameState.witchHasLifePotion) {
        nightActions.witchSave = true;
        gameState.witchHasLifePotion = false;
      } else if (action === 'kill' && targetId && gameState.witchHasDeathPotion) {
        nightActions.witchKill = targetId;
        gameState.witchHasDeathPotion = false;
      }
      checkNightEnd();
    }
  });

  socket.on("vote", (targetId: string) => {
    if (gameState.phase !== 'VOTE') return;
    votes[socket.id] = targetId;
    
    // Check if everyone voted
    const alivePlayers = gameState.players.filter((p: Player) => p.isAlive);
    if (Object.keys(votes).length === alivePlayers.length) {
      processVoteResults();
    }
  });

  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter((p: Player) => p.id !== socket.id);
    const firstPlayer = gameState.players[0];
    if (firstPlayer && !gameState.players.some((p: Player) => p.isHost)) {
      firstPlayer.isHost = true;
    }
    io.emit("gameStateUpdate", gameState);
  });
});

function checkNightEnd() {
  // Simple heuristic: if major roles have acted
  const werewolf = gameState.players.find((p: Player) => p.role === 'WEREWOLF' && p.isAlive);
  const seer = gameState.players.find((p: Player) => p.role === 'SEER' && p.isAlive);

  const wwActed = !werewolf || nightActions.werewolfTarget;
  const seerActed = !seer || nightActions.seerTarget;
  
  if (wwActed && seerActed) {
    transitionToDay();
  }
}

function transitionToDay() {
  let deathThisNight: string | null = null;
  if (nightActions.werewolfTarget && !nightActions.witchSave) {
    deathThisNight = nightActions.werewolfTarget;
  }
  if (nightActions.witchKill) {
    deathThisNight = nightActions.witchKill;
  }

  if (deathThisNight) {
    const deadPlayer = gameState.players.find((p: Player) => p.id === deathThisNight);
    if (deadPlayer) {
      deadPlayer.isAlive = false;
      gameState.lastDeath = deadPlayer.name;
    }
  } else {
    gameState.lastDeath = "Personne";
  }

  gameState.phase = 'DAY';
  nightActions = { werewolfTarget: null, seerTarget: null, witchSave: false, witchKill: null };
  io.emit("gameStateUpdate", gameState);

  setTimeout(() => {
    gameState.phase = 'VOTE';
    io.emit("gameStateUpdate", gameState);
  }, 30000);
}

function processVoteResults() {
  const voteCounts: Record<string, number> = {};
  Object.values(votes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
  const firstVote = sortedVotes[0];
  if (firstVote) {
    const eliminatedId = firstVote[0];
    const eliminatedPlayer = gameState.players.find((p: Player) => p.id === eliminatedId);
    if (eliminatedPlayer) eliminatedPlayer.isAlive = false;
  }

  votes = {};
  checkWinCondition();
}

function checkWinCondition() {
  const wolves = gameState.players.filter((p: Player) => p.role === 'WEREWOLF' && p.isAlive);
  const villagers = gameState.players.filter((p: Player) => p.role !== 'WEREWOLF' && p.isAlive);

  if (wolves.length === 0) {
    gameState.phase = 'END';
    gameState.winner = 'VILLAGERS';
  } else if (wolves.length >= villagers.length) {
    gameState.phase = 'END';
    gameState.winner = 'WEREWOLVES';
  } else {
    gameState.phase = 'NIGHT';
    gameState.dayCount++;
  }
  io.emit("gameStateUpdate", gameState);
}

function assignRoles() {
  const shuffledPlayers = [...gameState.players].sort(() => Math.random() - 0.5);
  // Simple role distribution logic for now
  shuffledPlayers.forEach((player, index) => {
    if (index === 0) player.role = 'WEREWOLF';
    else if (index === 1) player.role = 'SEER';
    else if (index === 2) player.role = 'WITCH';
    else player.role = 'VILLAGER';
    
    io.to(player.id).emit("roleAssigned", player.role);
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
