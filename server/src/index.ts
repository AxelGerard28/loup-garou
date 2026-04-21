import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { GameState, Player, Role, Phase, NightSubPhase, ChatMessage } from './types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms: Record<string, GameState> = {};
const roomVotes: Record<string, Record<string, string>> = {}; 
const roomNightActions: Record<string, any> = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomCode, name }: { roomCode: string, name: string }) => {
    const code = roomCode.toUpperCase();
    socket.join(code);

    if (!rooms[code]) {
      rooms[code] = {
        players: [],
        phase: 'LOBBY',
        dayCount: 0,
        witchHasLifePotion: true,
        witchHasDeathPotion: true,
        messages: [],
      };
      roomVotes[code] = {};
      roomNightActions[code] = { werewolfTarget: null, seerTarget: null, witchSave: false, witchKill: null };
    }

    const gameState = rooms[code]!;
    const isHost = gameState.players.length === 0;
    
    const newPlayer: Player = {
      id: socket.id,
      name,
      isAlive: true,
      isReady: false,
      isHost,
    };
    
    gameState.players.push(newPlayer);
    (socket as any).roomCode = code;

    io.to(code).emit("gameStateUpdate", gameState);
  });

  socket.on("sendMessage", (text: string) => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code]) return;
    const player = rooms[code]!.players.find((p: Player) => p.id === socket.id);
    if (!player || !player.isAlive) return;

    const newMessage: ChatMessage = {
      senderId: socket.id,
      senderName: player.name,
      text,
      timestamp: Date.now(),
    };

    rooms[code]!.messages.push(newMessage);
    io.to(code).emit("gameStateUpdate", rooms[code]);
  });

  socket.on("readyUp", () => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code]) return;
    const player = rooms[code]!.players.find((p: Player) => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(code).emit("gameStateUpdate", rooms[code]);
    }
  });

  socket.on("startGame", () => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code]) return;
    const player = rooms[code]!.players.find((p: Player) => p.id === socket.id);
    if (player?.isHost && rooms[code]!.players.length >= 4) {
      assignRoles(code);
      rooms[code]!.phase = 'NIGHT';
      rooms[code]!.nightSubPhase = 'SEER';
      rooms[code]!.dayCount = 1;
      io.to(code).emit("gameStateUpdate", rooms[code]);
    }
  });

  socket.on("roleAction", (action: string, targetId?: string) => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code] || rooms[code]!.phase !== 'NIGHT') return;
    
    const player = rooms[code]!.players.find((p: Player) => p.id === socket.id);
    if (!player || !player.isAlive) return;

    const subPhase = rooms[code]!.nightSubPhase;
    const actions = roomNightActions[code];

    if (player.role === 'SEER' && subPhase === 'SEER' && action === 'see' && targetId) {
      const target = rooms[code]!.players.find((p: Player) => p.id === targetId);
      socket.emit("actionResult", `Le rôle de ${target?.name} est ${target?.role}`);
      actions.seerTarget = targetId;
      advanceNight(code);
    } else if (player.role === 'WEREWOLF' && subPhase === 'WEREWOLF' && action === 'kill' && targetId) {
      actions.werewolfTarget = targetId;
      advanceNight(code);
    } else if (player.role === 'WITCH' && subPhase === 'WITCH') {
      if (action === 'save' && rooms[code]!.witchHasLifePotion) {
        actions.witchSave = true;
        rooms[code]!.witchHasLifePotion = false;
      } else if (action === 'kill' && targetId && rooms[code]!.witchHasDeathPotion) {
        actions.witchKill = targetId;
        rooms[code]!.witchHasDeathPotion = false;
      } else if (action === 'skip') {
        // Just advance
      }
      advanceNight(code);
    }
  });

  socket.on("vote", (targetId: string) => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code] || rooms[code]!.phase !== 'VOTE') return;
    
    roomVotes[code]![socket.id] = targetId;
    
    const alivePlayers = rooms[code]!.players.filter((p: Player) => p.isAlive);
    if (Object.keys(roomVotes[code]!).length === alivePlayers.length) {
      processVoteResults(code);
    }
  });

  socket.on("resetGame", () => {
    const code = (socket as any).roomCode;
    if (!code || !rooms[code]) return;
    const player = rooms[code]!.players.find((p: Player) => p.id === socket.id);
    if (player?.isHost) {
      rooms[code] = {
        players: rooms[code]!.players.map(p => {
          const { role, ...rest } = p;
          return { ...rest, isAlive: true, isReady: false };
        }),
        phase: 'LOBBY',
        dayCount: 0,
        witchHasLifePotion: true,
        witchHasDeathPotion: true,
        messages: [],
      };
      roomVotes[code] = {};
      roomNightActions[code] = { werewolfTarget: null, seerTarget: null, witchSave: false, witchKill: null };
      io.to(code).emit("gameStateUpdate", rooms[code]);
    }
  });

  socket.on("disconnect", () => {
    const code = (socket as any).roomCode;
    if (code && rooms[code]) {
      rooms[code]!.players = rooms[code]!.players.filter((p: Player) => p.id !== socket.id);
      const firstPlayer = rooms[code]!.players[0];
      if (firstPlayer && !rooms[code]!.players.some((p: Player) => p.isHost)) {
        firstPlayer.isHost = true;
      }
      if (rooms[code]!.players.length === 0) {
        delete rooms[code];
        delete roomVotes[code];
        delete roomNightActions[code];
      } else {
        io.to(code).emit("gameStateUpdate", rooms[code]);
      }
    }
  });
});

function advanceNight(code: string) {
  const gameState = rooms[code];
  if (!gameState) return;

  const currentSubPhase = gameState.nightSubPhase;

  if (currentSubPhase === 'SEER') {
    gameState.nightSubPhase = 'WEREWOLF';
    // If no werewolves (shouldn't happen), skip to next
    if (!gameState.players.some(p => p.role === 'WEREWOLF' && p.isAlive)) {
      advanceNight(code);
      return;
    }
  } else if (currentSubPhase === 'WEREWOLF') {
    gameState.nightSubPhase = 'WITCH';
    if (!gameState.players.some(p => p.role === 'WITCH' && p.isAlive)) {
      advanceNight(code);
      return;
    }
  } else if (currentSubPhase === 'WITCH') {
    gameState.nightSubPhase = 'END';
    transitionToDay(code);
    return;
  }

  io.to(code).emit("gameStateUpdate", gameState);
}

function transitionToDay(code: string) {
  const gameState = rooms[code];
  if (!gameState) return;
  const actions = roomNightActions[code];

  let deathThisNight: string | null = null;
  if (actions.werewolfTarget && !actions.witchSave) {
    deathThisNight = actions.werewolfTarget;
  }
  if (actions.witchKill) {
    deathThisNight = actions.witchKill;
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
  gameState.nightSubPhase = undefined;
  roomNightActions[code] = { werewolfTarget: null, seerTarget: null, witchSave: false, witchKill: null };
  io.to(code).emit("gameStateUpdate", gameState);

  setTimeout(() => {
    if (rooms[code] && rooms[code]!.phase === 'DAY') {
      rooms[code]!.phase = 'VOTE';
      io.to(code).emit("gameStateUpdate", rooms[code]);
    }
  }, 30000);
}

function processVoteResults(code: string) {
  const gameState = rooms[code];
  if (!gameState) return;
  const votes = roomVotes[code]!;

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

  roomVotes[code] = {};
  checkWinCondition(code);
}

function checkWinCondition(code: string) {
  const gameState = rooms[code];
  if (!gameState) return;

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
    gameState.nightSubPhase = 'SEER';
    gameState.dayCount++;
  }
  io.to(code).emit("gameStateUpdate", gameState);
}

function assignRoles(code: string) {
  const gameState = rooms[code];
  if (!gameState) return;
  const shuffledPlayers = [...gameState.players].sort(() => Math.random() - 0.5);
  shuffledPlayers.forEach((player, index) => {
    if (index === 0) player.role = 'WEREWOLF';
    else if (index === 1) player.role = 'SEER';
    else if (index === 2) player.role = 'WITCH';
    else player.role = 'VILLAGER';
    
    io.to(player.id).emit("roleAssigned", player.role);
  });
}

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
